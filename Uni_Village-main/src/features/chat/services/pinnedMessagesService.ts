import AsyncStorage from '@react-native-async-storage/async-storage';

const PINNED_MESSAGES_KEY = 'pinned_messages';
const MAX_PINNED_PER_CONVERSATION = 3;

interface PinnedMessage {
    messageId: number;
    conversationId: string;
    pinnedAt: string;
}

class PinnedMessagesService {
    private cache: Map<string, number[]> = new Map();

    async getPinnedMessages(conversationId: string): Promise<number[]> {
        if (this.cache.has(conversationId)) {
            return this.cache.get(conversationId)!;
        }

        try {
            const data = await AsyncStorage.getItem(`${PINNED_MESSAGES_KEY}_${conversationId}`);
            const pinned = data ? JSON.parse(data) : [];
            this.cache.set(conversationId, pinned);
            return pinned;
        } catch (error) {
            console.error('Error getting pinned messages:', error);
            return [];
        }
    }

    async pinMessage(conversationId: string, messageId: number): Promise<boolean> {
        try {
            const current = await this.getPinnedMessages(conversationId);

            if (current.includes(messageId)) {
                return true;
            }

            if (current.length >= MAX_PINNED_PER_CONVERSATION) {
                throw new Error(`Chỉ có thể ghim tối đa ${MAX_PINNED_PER_CONVERSATION} tin nhắn`);
            }

            const updated = [...current, messageId];
            await AsyncStorage.setItem(
                `${PINNED_MESSAGES_KEY}_${conversationId}`,
                JSON.stringify(updated)
            );
            this.cache.set(conversationId, updated);
            return true;
        } catch (error) {
            console.error('Error pinning message:', error);
            throw error;
        }
    }

    async unpinMessage(conversationId: string, messageId: number): Promise<boolean> {
        try {
            const current = await this.getPinnedMessages(conversationId);
            const updated = current.filter((id) => id !== messageId);

            await AsyncStorage.setItem(
                `${PINNED_MESSAGES_KEY}_${conversationId}`,
                JSON.stringify(updated)
            );
            this.cache.set(conversationId, updated);
            return true;
        } catch (error) {
            console.error('Error unpinning message:', error);
            return false;
        }
    }

    async isPinned(conversationId: string, messageId: number): Promise<boolean> {
        const pinned = await this.getPinnedMessages(conversationId);
        return pinned.includes(messageId);
    }

    async clearPinnedMessages(conversationId: string): Promise<void> {
        try {
            await AsyncStorage.removeItem(`${PINNED_MESSAGES_KEY}_${conversationId}`);
            this.cache.delete(conversationId);
        } catch (error) {
            console.error('Error clearing pinned messages:', error);
        }
    }

    clearCache(): void {
        this.cache.clear();
    }
}

export const pinnedMessagesService = new PinnedMessagesService();
