/**
 * AcceptMessageRequestBanner Component
 * Banner shown in ChatThreadScreen for REQUEST conversations
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

import { useMessageRequestActions } from '../hooks';

interface AcceptMessageRequestBannerProps {
    conversationId: string;
    senderName: string;
}

/**
 * Banner for accepting or declining message requests in a chat thread
 */
export function AcceptMessageRequestBanner({
    conversationId,
    senderName
}: AcceptMessageRequestBannerProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];
    const router = useRouter();

    const [isHidden, setIsHidden] = useState(false);
    const { accept, decline, isAccepting, isDeleting } = useMessageRequestActions();

    if (isHidden) {
        return null;
    }

    const isLoading = isAccepting || isDeleting;

    const handleAccept = async () => {
        setIsHidden(true);

        try {
            await accept(conversationId);
        } catch {
            setIsHidden(false);
            Alert.alert('Lỗi', 'Không thể chấp nhận tin nhắn. Vui lòng thử lại.');
        }
    };

    const handleDelete = async () => {
        try {
            await decline(conversationId);
            router.back();
        } catch {
            Alert.alert('Lỗi', 'Không thể xóa tin nhắn. Vui lòng thử lại.');
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={styles.iconContainer}>
                <Ionicons name="person-add-outline" size={20} color={colors.textSecondary} />
            </View>

            <View style={styles.content}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                    Tin nhắn từ {senderName}
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Chấp nhận để trả lời và thêm vào hộp thư
                </Text>
            </View>

            <View style={styles.actions}>
                <Pressable
                    style={[styles.deleteButton, { borderColor: colors.border }]}
                    onPress={handleDelete}
                    disabled={isLoading}
                >
                    {isDeleting ? (
                        <ActivityIndicator size="small" color={colors.textSecondary} />
                    ) : (
                        <Text style={[styles.deleteText, { color: colors.textSecondary }]}>Xóa</Text>
                    )}
                </Pressable>

                <Pressable
                    style={[styles.acceptButton, { backgroundColor: colors.tint }]}
                    onPress={handleAccept}
                    disabled={isLoading}
                >
                    {isAccepting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <Text style={styles.acceptText}>Chấp nhận</Text>
                    )}
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        borderBottomWidth: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        marginLeft: Spacing.sm,
    },
    title: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.semibold,
        lineHeight: 18,
    },
    subtitle: {
        fontSize: Typography.sizes.xs,
        fontWeight: Typography.weights.normal,
        lineHeight: 16,
        marginTop: 2,
    },
    actions: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    deleteButton: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: 20,
        borderWidth: 1.5,
    },
    deleteText: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.medium,
    },
    acceptButton: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: 20,
    },
    acceptText: {
        color: '#FFFFFF',
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.medium,
    },
});
