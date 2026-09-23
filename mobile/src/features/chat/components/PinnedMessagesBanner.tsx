import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import { usePinnedMessages, useUnpinMessage } from '../hooks/usePinnedMessages';
import type { MessageResponse } from '@/shared/types/backend.types';

interface PinnedMessagesBannerProps {
    conversationId: string;
    messages: MessageResponse[];
    onMessagePress: (messageId: number) => void;
}

export function PinnedMessagesBanner({
    conversationId,
    messages,
    onMessagePress,
}: PinnedMessagesBannerProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];
    const { data: pinnedIds } = usePinnedMessages(conversationId);
    const { mutate: unpinMessage } = useUnpinMessage();

    if (!pinnedIds || pinnedIds.length === 0) {
        return null;
    }

    const pinnedMessages = messages.filter((m) => pinnedIds.includes(m.id));

    if (pinnedMessages.length === 0) {
        return null;
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.chipBackground, borderBottomColor: colors.border }]}>
            <View style={styles.header}>
                <MaterialIcons name="push-pin" size={16} color={colors.actionBlue} />
                <Text style={[styles.headerText, { color: colors.text }]}>
                    Tin nhắn đã ghim
                </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
                {pinnedMessages.map((message) => (
                    <Pressable
                        key={message.id}
                        style={[styles.pinnedItem, { backgroundColor: colors.card }]}
                        onPress={() => onMessagePress(message.id)}
                    >
                        <Text style={[styles.senderName, { color: colors.actionBlue }]} numberOfLines={1}>
                            {message.senderName}
                        </Text>
                        <Text style={[styles.content, { color: colors.text }]} numberOfLines={2}>
                            {message.content}
                        </Text>
                        <Pressable
                            style={styles.unpinButton}
                            onPress={(e) => {
                                e.stopPropagation();
                                unpinMessage({ conversationId, messageId: message.id });
                            }}
                        >
                            <MaterialIcons name="close" size={16} color={colors.textSecondary} />
                        </Pressable>
                    </Pressable>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.md,
        marginBottom: Spacing.xs,
    },
    headerText: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.semibold,
    },
    scroll: {
        paddingHorizontal: Spacing.md,
    },
    pinnedItem: {
        width: 200,
        padding: Spacing.sm,
        borderRadius: 8,
        marginRight: Spacing.sm,
        position: 'relative',
    },
    senderName: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.semibold,
        marginBottom: 2,
    },
    content: {
        fontSize: Typography.sizes.sm,
        lineHeight: 18,
    },
    unpinButton: {
        position: 'absolute',
        top: 4,
        right: 4,
        padding: 2,
    },
});
