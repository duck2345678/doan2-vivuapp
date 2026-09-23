import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { queryKeys } from '@/config/queryKeys';
import { MessageType } from '@/lib/api/generated';
import { websocketService, WebSocketService } from '@/lib/websocket';
import type { MessageResponse } from '@/shared/types/backend.types';
import type { Slice } from '@/shared/types/pagination.types';
import { conversationsApi, messagesApi } from '../api';
import { extractUserIdFromVirtualThread, isVirtualThreadId } from '../services';
import { useChatStore } from '../store';

interface InfiniteMessagesData {
    pages: Slice<MessageResponse>[];
    pageParams: number[];
}

interface SendMessageInput {
    threadId: string;
    text: string;
    replyToId?: number;
    recipientId?: number;
    senderInfo: {
        id: number;
        displayName: string;
        avatarUrl?: string;
    };
}

interface OptimisticMessage extends MessageResponse {
    _clientMessageId: string;
    _isOptimistic: boolean;
    _status: 'sending' | 'sent' | 'error';
    _error?: string;
}

function dedupePagesById(pages: Slice<MessageResponse>[]) {
    const seen = new Set<number>();

    return pages.map((page) => {
        const filtered = page.content.filter((msg) => {
            if (msg.id == null) return true;
            if (seen.has(msg.id)) return false;
            seen.add(msg.id);
            return true;
        });

        if (filtered.length === page.content.length) {
            return page;
        }

        return {
            ...page,
            content: filtered,
            numberOfElements: filtered.length,
            empty: filtered.length === 0,
        };
    });
}

const FALLBACK_TIMEOUT_MS = 15000;
const CACHE_MATCH_WINDOW_MS = 20000;

export function useSendMessageHybrid() {
    const queryClient = useQueryClient();
    const { handleAck, addPendingMessage } = useChatStore();
    const pendingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    useEffect(() => {
        return () => {
            pendingTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
            pendingTimeoutsRef.current.clear();
        };
    }, []);

    const createOptimisticMessage = useCallback(
        (input: SendMessageInput, clientMessageId: string): OptimisticMessage => {
            return {
                id: -Date.now(),
                _clientMessageId: clientMessageId,
                _isOptimistic: true,
                _status: 'sending',
                senderId: input.senderInfo.id,
                senderName: input.senderInfo.displayName,
                senderAvatarUrl: input.senderInfo.avatarUrl,
                content: input.text,
                messageType: MessageType.TEXT,
                conversationId: input.threadId,
                timestamp: new Date().toISOString(),
                isActive: true,
                readBy: [],
                replyToId: input.replyToId,
            } as OptimisticMessage;
        },
        []
    );

    const updateOptimisticStatus = useCallback(
        (
            conversationId: string,
            clientMessageId: string,
            status: 'sending' | 'sent' | 'error',
            error?: string
        ) => {
            const queryKey = queryKeys.messages.list(conversationId, {});
            queryClient.setQueryData<InfiniteMessagesData>(queryKey, (oldData) => {
                if (!oldData?.pages?.length) return oldData;

                const newPages = oldData.pages.map((page) => ({
                    ...page,
                    content: page.content.map((msg) => {
                        const optimistic = msg as unknown as OptimisticMessage;
                        if (optimistic._clientMessageId === clientMessageId) {
                            return {
                                ...msg,
                                _status: status,
                                _error: error,
                            };
                        }
                        return msg;
                    }),
                }));

                return { ...oldData, pages: newPages };
            });
        },
        [queryClient]
    );

    const replaceOptimisticWithReal = useCallback(
        (conversationId: string, clientMessageId: string, realMessage: MessageResponse) => {
            const queryKey = queryKeys.messages.list(conversationId, {});
            queryClient.setQueryData<InfiniteMessagesData>(queryKey, (oldData) => {
                if (!oldData?.pages?.length) return oldData;

                const newPages = oldData.pages.map((page) => ({
                    ...page,
                    content: page.content.map((msg) => {
                        const optimistic = msg as unknown as OptimisticMessage;
                        if (optimistic._clientMessageId === clientMessageId) {
                            return realMessage;
                        }
                        return msg;
                    }),
                }));

                return { ...oldData, pages: dedupePagesById(newPages) };
            });
        },
        [queryClient]
    );

    const removeOptimisticMessage = useCallback(
        (conversationId: string, clientMessageId: string) => {
            const queryKey = queryKeys.messages.list(conversationId, {});
            queryClient.setQueryData<InfiniteMessagesData>(queryKey, (oldData) => {
                if (!oldData?.pages?.length) return oldData;

                const newPages = oldData.pages.map((page) => ({
                    ...page,
                    content: page.content.filter((msg) => {
                        const optimistic = msg as unknown as OptimisticMessage;
                        return optimistic._clientMessageId !== clientMessageId;
                    }),
                }));

                return { ...oldData, pages: newPages };
            });
        },
        [queryClient]
    );

    const sendViaHTTP = useCallback(
        async (input: SendMessageInput, clientMessageId: string) => {
            console.log('[Hybrid Send] Falling back to HTTP:', clientMessageId);

            try {
                // Resolve conversation ID for virtual threads
                let conversationId = input.threadId;

                if (isVirtualThreadId(input.threadId)) {
                    const userId = extractUserIdFromVirtualThread(input.threadId);
                    if (!userId) {
                        throw new Error('Invalid virtual thread ID');
                    }
                    console.log('[Hybrid Send] Resolving virtual thread for user:', userId);

                    try {
                        // Always fetch fresh - handles re-activation after delete
                        const directResponse = await conversationsApi.getOrCreateDirect(userId);
                        conversationId = directResponse.result.conversationId;

                        // Update cache with fresh data
                        queryClient.setQueryData(['directConversation', userId], directResponse.result);

                        console.log('[Hybrid Send] Resolved to conversation:', conversationId);
                    } catch (resolveError) {
                        console.error('[Hybrid Send] Failed to resolve conversation:', resolveError);

                        // Clear stale cache and retry once
                        queryClient.removeQueries({
                            predicate: (q) =>
                                q.queryKey[0] === 'directConversation' ||
                                (Array.isArray(q.queryKey) && q.queryKey.includes(input.threadId)),
                        });

                        // Retry once after clearing cache
                        const retryResponse = await conversationsApi.getOrCreateDirect(userId);
                        conversationId = retryResponse.result.conversationId;

                        console.log('[Hybrid Send] Retry resolved to conversation:', conversationId);
                    }
                }

                const response = await messagesApi.sendMessage({
                    content: input.text,
                    ConversationId: conversationId,
                    replyToId: input.replyToId,
                });

                const realMessage = response.result;
                replaceOptimisticWithReal(input.threadId, clientMessageId, realMessage);

                queryClient.invalidateQueries({
                    queryKey: queryKeys.conversations.all,
                });

                console.log('[Hybrid Send] HTTP success:', realMessage.id);
                return realMessage;
            } catch (error) {
                console.error('[Hybrid Send] HTTP failed:', error);
                updateOptimisticStatus(
                    input.threadId,
                    clientMessageId,
                    'error',
                    'Failed to send message'
                );
                throw error;
            }
        },
        [queryClient, replaceOptimisticWithReal, updateOptimisticStatus]
    );

    const sendMessage = useCallback(
        async (input: SendMessageInput) => {
            const clientMessageId = WebSocketService.generateClientMessageId();
            const optimisticMessage = createOptimisticMessage(input, clientMessageId);

            const queryKey = queryKeys.messages.list(input.threadId, {});
            queryClient.setQueryData<InfiniteMessagesData>(queryKey, (oldData) => {
                if (!oldData?.pages?.length) {
                    return oldData;
                }

                const newPages = [...oldData.pages];
                newPages[0] = {
                    ...newPages[0],
                    content: [optimisticMessage as unknown as MessageResponse, ...newPages[0].content],
                    numberOfElements: newPages[0].numberOfElements + 1,
                };

                return { ...oldData, pages: newPages };
            });

            // Add to store to track ACK
            addPendingMessage({
                clientMessageId,
                recipientId: input.recipientId || 0,
                conversationId: input.threadId,
                content: input.text,
                replyToId: input.replyToId,
            });

            const isWSConnected = websocketService.isConnected();

            // Only use WebSocket if connected AND we have a valid recipientId (mostly for DMs)
            if (!isWSConnected || !input.recipientId) {
                console.log(
                    !isWSConnected
                        ? '[Hybrid Send] WebSocket not connected, using HTTP directly'
                        : '[Hybrid Send] No recipientId provided (Group Chat?), using HTTP directly'
                );
                return sendViaHTTP(input, clientMessageId);
            }

            console.log('[Hybrid Send] Attempting WebSocket send:', clientMessageId);
            const sentAt = Date.now();

            const receiptId = `msg-${clientMessageId}`;
            websocketService.watchForReceipt(receiptId, () => {
                handleAck({
                    clientMessageId,
                    status: 'DELIVERED',
                    conversationId: input.threadId,
                });
            });

            const wsSent = websocketService.sendChatMessage({
                recipientId: input.recipientId,
                content: input.text,
                clientMessageId,
                replyToId: input.replyToId,
            }, { receiptId });

            if (!wsSent) {
                return sendViaHTTP(input, clientMessageId);
            }

            const findMatchingMessageInCache = () => {
                const cached = queryClient.getQueryData<InfiniteMessagesData>(queryKey);
                if (!cached?.pages?.length) return undefined;

                const allMessages = cached.pages.flatMap((page) => page.content);
                const byClientId = allMessages.find((msg) => {
                    const payload = msg as MessageResponse & {
                        clientMessageId?: string;
                        _clientMessageId?: string;
                    };
                    return (
                        payload.clientMessageId === clientMessageId ||
                        payload._clientMessageId === clientMessageId
                    );
                });

                if (byClientId) return byClientId;

                const candidates = allMessages
                    .filter(
                        (msg) =>
                            msg.senderId === input.senderInfo.id &&
                            msg.content === input.text &&
                            (msg.replyToId ?? null) === (input.replyToId ?? null)
                    )
                    .map((msg) => {
                        const timestamp = Date.parse(msg.timestamp);
                        if (!Number.isFinite(timestamp)) return null;
                        return { msg, delta: Math.abs(timestamp - sentAt) };
                    })
                    .filter((candidate): candidate is { msg: MessageResponse; delta: number } => {
                        return !!candidate && candidate.delta <= CACHE_MATCH_WINDOW_MS;
                    })
                    .sort((a, b) => a.delta - b.delta);

                return candidates[0]?.msg;
            };

            return new Promise<MessageResponse>((resolve, reject) => {
                let resolved = false;

                const timeout = setTimeout(async () => {
                    if (resolved) return;
                    const pending = useChatStore.getState().pendingMessages.get(clientMessageId);

                    if (!pending) {
                        return;
                    }

                    const cachedMessage = findMatchingMessageInCache();
                    if (cachedMessage) {
                        handleAck({
                            clientMessageId,
                            status: 'DELIVERED',
                            conversationId: input.threadId,
                        });
                        replaceOptimisticWithReal(input.threadId, clientMessageId, cachedMessage);
                        updateOptimisticStatus(input.threadId, clientMessageId, 'sent');
                        pendingTimeoutsRef.current.delete(clientMessageId);
                        resolved = true;
                        resolve(cachedMessage);
                        return;
                    }

                    console.log(
                        '[Hybrid Send] No WS ACK/message, falling back to HTTP:',
                        clientMessageId
                    );
                    pendingTimeoutsRef.current.delete(clientMessageId);
                    resolved = true;

                    try {
                        const realMessage = await sendViaHTTP(input, clientMessageId);
                        resolve(realMessage);
                    } catch (error) {
                        reject(error);
                    }
                }, FALLBACK_TIMEOUT_MS);

                pendingTimeoutsRef.current.set(clientMessageId, timeout);

                const checkInterval = setInterval(() => {
                    if (resolved) {
                        clearInterval(checkInterval);
                        return;
                    }

                    const pending = useChatStore.getState().pendingMessages.get(clientMessageId);

                    if (!pending) {
                        const timeout = pendingTimeoutsRef.current.get(clientMessageId);
                        if (timeout) {
                            clearTimeout(timeout);
                            pendingTimeoutsRef.current.delete(clientMessageId);
                        }
                        clearInterval(checkInterval);
                        resolved = true;

                        updateOptimisticStatus(input.threadId, clientMessageId, 'sent');

                        resolve(optimisticMessage as unknown as MessageResponse);
                    } else if (pending.status === 'error') {
                        const timeout = pendingTimeoutsRef.current.get(clientMessageId);
                        if (timeout) {
                            clearTimeout(timeout);
                            pendingTimeoutsRef.current.delete(clientMessageId);
                        }
                        clearInterval(checkInterval);
                        resolved = true;

                        updateOptimisticStatus(
                            input.threadId,
                            clientMessageId,
                            'error',
                            pending.errorMessage || 'Failed to send'
                        );

                        sendViaHTTP(input, clientMessageId)
                            .then(resolve)
                            .catch(reject);
                    }
                }, 100);
            });
        },
        [
            createOptimisticMessage,
            queryClient,
            sendViaHTTP,
            updateOptimisticStatus,
            replaceOptimisticWithReal,
            handleAck,
        ]
    );

    const sendImage = useCallback(
        async (
            threadId: string,
            file: { uri: string; name: string; type: string },
            senderInfo: { id: number; displayName: string; avatarUrl?: string },
            caption?: string
        ) => {
            const clientMessageId = WebSocketService.generateClientMessageId();

            // Optimistic message
            const optimisticMessage: OptimisticMessage = {
                id: -Date.now(),
                _clientMessageId: clientMessageId,
                _isOptimistic: true,
                _status: 'sending',
                senderId: senderInfo.id,
                senderName: senderInfo.displayName,
                senderAvatarUrl: senderInfo.avatarUrl,
                content: caption || '',
                messageType: MessageType.IMAGE,
                conversationId: threadId,
                timestamp: new Date().toISOString(),
                isActive: true,
                readBy: [],
                fileUrls: [file.uri], // Use local URI for display
            } as unknown as OptimisticMessage;

            // Update cache
            const queryKey = queryKeys.messages.list(threadId, {});
            queryClient.setQueryData<InfiniteMessagesData>(queryKey, (oldData) => {
                if (!oldData?.pages?.length) return oldData;
                const newPages = [...oldData.pages];
                newPages[0] = {
                    ...newPages[0],
                    content: [optimisticMessage as unknown as MessageResponse, ...newPages[0].content],
                    numberOfElements: newPages[0].numberOfElements + 1,
                };
                return { ...oldData, pages: newPages };
            });

            try {
                // Upload and send
                const response = await messagesApi.sendMessageWithFiles({
                    conversationId: threadId,
                    content: caption,
                    files: [file],
                });

                const realMessage = response.result;

                // Replace optimistic with real
                replaceOptimisticWithReal(threadId, clientMessageId, realMessage as MessageResponse);

                queryClient.invalidateQueries({
                    queryKey: queryKeys.conversations.all,
                });

                return realMessage;

            } catch (error) {
                console.error('[Hybrid Send] Image upload failed:', error);
                updateOptimisticStatus(
                    threadId,
                    clientMessageId,
                    'error',
                    'Failed to send image'
                );
                throw error;
            }
        },
        [queryClient, replaceOptimisticWithReal, updateOptimisticStatus]
    );

    const retry = useCallback(
        async (conversationId: string, clientMessageId: string, input: SendMessageInput) => {
            console.log('[Hybrid Send] Retrying message:', clientMessageId);
            updateOptimisticStatus(conversationId, clientMessageId, 'sending');

            try {
                const realMessage = await sendViaHTTP(input, clientMessageId);
                return realMessage;
            } catch (error) {
                updateOptimisticStatus(
                    conversationId,
                    clientMessageId,
                    'error',
                    'Retry failed'
                );
                throw error;
            }
        },
        [sendViaHTTP, updateOptimisticStatus]
    );

    return {
        sendMessage,
        sendImage,
        retry,
        canSend: websocketService.isConnected(),
    };
}
