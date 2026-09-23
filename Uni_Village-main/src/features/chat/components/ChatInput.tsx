import { MaterialIcons } from '@expo/vector-icons';
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors, Spacing } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import { useSendMessage, useSendMessageWithFiles } from '../hooks';
import { useTypingIndicator } from '../hooks/useRealtime';
import { fileUploadService } from '@/features/post/services';

interface ChatInputProps {
    conversationId: string;
    replyToId?: number;
    onSent?: () => void;
}

export function ChatInput({ conversationId, replyToId, onSent }: ChatInputProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];
    const [message, setMessage] = useState('');
    const [files, setFiles] = useState<any[]>([]);
    const typingTimeoutRef = useRef<NodeJS.Timeout>();

    const { mutate: sendMessage, isPending: isSending } = useSendMessage();
    const { mutate: sendWithFiles, isPending: isSendingFiles } = useSendMessageWithFiles();
    const { sendTypingEvent } = useTypingIndicator(conversationId);

    const handleTextChange = (text: string) => {
        setMessage(text);

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        if (text.length > 0) {
            sendTypingEvent(true);

            typingTimeoutRef.current = setTimeout(() => {
                sendTypingEvent(false);
            }, 1000);
        } else {
            sendTypingEvent(false);
        }
    };

    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            sendTypingEvent(false);
        };
    }, [sendTypingEvent]);

    const handleSend = () => {
        if (!message.trim() && files.length === 0) return;
        if (isSending || isSendingFiles) return;

        if (files.length > 0) {
            sendWithFiles(
                {
                    conversationId,
                    content: message.trim() || undefined,
                    replyToId,
                    files,
                },
                {
                    onSuccess: () => {
                        setMessage('');
                        setFiles([]);
                        sendTypingEvent(false);
                        onSent?.();
                    },
                }
            );
        } else {
            sendMessage(
                {
                    content: message.trim(),
                    ConversationId: conversationId,
                    replyToId,
                },
                {
                    onSuccess: () => {
                        setMessage('');
                        sendTypingEvent(false);
                        onSent?.();
                    },
                }
            );
        }
    };

    const handlePickFiles = async () => {
        try {
            const picked = await fileUploadService.pickMedia(true);
            setFiles((prev) => [...prev, ...picked]);
        } catch (error) {
            console.error('Failed to pick files:', error);
        }
    };

    const canSend = (message.trim().length > 0 || files.length > 0) && !isSending && !isSendingFiles;

    return (
        <View style={[styles.container, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            {files.length > 0 && (
                <View style={styles.filesPreview}>
                    {/* TODO: Add file preview thumbnails */}
                </View>
            )}
            
            <View style={styles.inputRow}>
                <TouchableOpacity onPress={handlePickFiles} style={styles.iconButton}>
                    <MaterialIcons name="attach-file" size={24} color={colors.textSecondary} />
                </TouchableOpacity>

                <TextInput
                    style={[styles.input, { color: colors.text, backgroundColor: colors.chipBackground }]}
                    placeholder="Nhắn tin..."
                    placeholderTextColor={colors.textSecondary}
                    value={message}
                    onChangeText={handleTextChange}
                    multiline
                    maxLength={1000}
                />

                <TouchableOpacity
                    onPress={handleSend}
                    disabled={!canSend}
                    style={[
                        styles.sendButton,
                        { backgroundColor: canSend ? colors.actionBlue : colors.chipBackground },
                    ]}
                >
                    <MaterialIcons
                        name="send"
                        size={20}
                        color={canSend ? '#fff' : colors.textSecondary}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderTopWidth: 1,
        padding: Spacing.sm,
    },
    filesPreview: {
        marginBottom: Spacing.sm,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: Spacing.sm,
    },
    iconButton: {
        padding: Spacing.xs,
    },
    input: {
        flex: 1,
        borderRadius: 20,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        maxHeight: 100,
        fontSize: 16,
    },
    sendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
