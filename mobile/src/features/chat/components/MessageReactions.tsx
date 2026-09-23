import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Spacing } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import { useMessageReactions, useAddMessageReaction, useRemoveMessageReaction } from '../hooks';
import { useAuthStore } from '@/features/auth';

interface MessageReactionsProps {
    messageId: number;
    conversationId: string;
}

export function MessageReactions({ messageId, conversationId }: MessageReactionsProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];
    const currentUserId = useAuthStore((state) => state.user?.id);
    
    const { groupedReactions } = useMessageReactions(messageId, conversationId);
    const { mutate: addReaction } = useAddMessageReaction();
    const { mutate: removeReaction } = useRemoveMessageReaction();

    if (Object.keys(groupedReactions).length === 0) {
        return null;
    }

    const handleReactionPress = (emoji: string) => {
        const reactions = groupedReactions[emoji] || [];
        const userReacted = reactions.some((r) => String(r.userId) === currentUserId);

        if (userReacted) {
            removeReaction({ messageId, emoji, conversationId });
        } else {
            addReaction({ messageId, emoji, conversationId });
        }
    };

    return (
        <View style={styles.container}>
            {Object.entries(groupedReactions).map(([emoji, reactionList]) => {
                const count = reactionList.length;
                const userReacted = reactionList.some((r) => String(r.userId) === currentUserId);

                return (
                    <Pressable
                        key={emoji}
                        style={[
                            styles.reactionBubble,
                            {
                                backgroundColor: userReacted
                                    ? colors.actionBlue + '20'
                                    : colors.chipBackground,
                                borderColor: userReacted ? colors.actionBlue : colors.border,
                            },
                        ]}
                        onPress={() => handleReactionPress(emoji)}
                    >
                        <Text style={styles.emoji}>{emoji}</Text>
                        <Text
                            style={[
                                styles.count,
                                { color: userReacted ? colors.actionBlue : colors.textSecondary },
                            ]}
                        >
                            {count}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
        marginTop: Spacing.xs,
    },
    reactionBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        gap: 4,
    },
    emoji: {
        fontSize: 16,
    },
    count: {
        fontSize: 12,
        fontWeight: '600',
    },
});
