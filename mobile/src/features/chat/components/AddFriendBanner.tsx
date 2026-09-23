import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

import type { RelationshipStatus } from '../api/friends.api';
import { useAcceptFriendRequest, useSendFriendRequest } from '../hooks';

// Conversation API might return 'ACCEPTED', while Friends API returns 'FRIEND'
type BannerRelationshipStatus = RelationshipStatus | 'ACCEPTED';

interface AddFriendBannerProps {
    otherUserId: number;
    otherUserName: string;
    relationshipStatus: BannerRelationshipStatus;
    onStatusChange?: (newStatus: BannerRelationshipStatus) => void;
}

export function AddFriendBanner({ 
    otherUserId, 
    otherUserName, 
    relationshipStatus,
    onStatusChange 
}: AddFriendBannerProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];
    
    const [currentStatus, setCurrentStatus] = useState(relationshipStatus);
    const { mutateAsync: sendRequest, isPending: isSending } = useSendFriendRequest();
    const { mutateAsync: acceptRequest, isPending: isAccepting } = useAcceptFriendRequest();

    const isLoading = isSending || isAccepting;

    const handleSendRequest = async () => {
        try {
            await sendRequest(otherUserId);
            setCurrentStatus('PENDING_OUTGOING');
            onStatusChange?.('PENDING_OUTGOING');
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể gửi lời mời kết bạn. Vui lòng thử lại.');
        }
    };

    const handleAcceptRequest = async () => {
        try {
            await acceptRequest(otherUserId);
            setCurrentStatus('FRIEND');
            onStatusChange?.('FRIEND');
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể chấp nhận lời mời. Vui lòng thử lại.');
        }
    };

    if (currentStatus === 'ACCEPTED' || currentStatus === 'FRIEND' || currentStatus === 'BLOCKED' || currentStatus === 'BLOCKED_BY') {
        return null;
    }

    return (
        <View style={[styles.container, { 
            backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5',
            borderBottomColor: colors.border 
        }]}>
            <View style={styles.iconContainer}>
                <Ionicons 
                    name="person-add-outline" 
                    size={20} 
                    color={colors.actionBlue} 
                />
            </View>

            <View style={styles.content}>
                {currentStatus === 'NONE' && (
                    <>
                        <Text style={[styles.title, { color: colors.text }]}>
                            Kết bạn với {otherUserName}
                        </Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                            Gửi lời mời kết bạn để dễ dàng nhắn tin
                        </Text>
                    </>
                )}

                {currentStatus === 'PENDING_OUTGOING' && (
                    <>
                        <Text style={[styles.title, { color: colors.text }]}>
                            Đã gửi lời mời kết bạn
                        </Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                            Đang chờ {otherUserName} chấp nhận
                        </Text>
                    </>
                )}

                {currentStatus === 'PENDING_INCOMING' && (
                    <>
                        <Text style={[styles.title, { color: colors.text }]}>
                            {otherUserName} đã gửi lời mời kết bạn
                        </Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                            Chấp nhận để trở thành bạn bè
                        </Text>
                    </>
                )}
            </View>

            <View style={styles.actions}>
                {currentStatus === 'NONE' && (
                    <Pressable
                        style={[styles.addButton, { backgroundColor: colors.actionBlue }]}
                        onPress={handleSendRequest}
                        disabled={isLoading}
                    >
                        {isSending ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text style={styles.addButtonText}>Kết bạn</Text>
                        )}
                    </Pressable>
                )}

                {currentStatus === 'PENDING_OUTGOING' && (
                    <View style={[styles.sentBadge, { backgroundColor: colors.textSecondary + '20' }]}>
                        <Text style={[styles.sentText, { color: colors.textSecondary }]}>Đã gửi</Text>
                    </View>
                )}

                {currentStatus === 'PENDING_INCOMING' && (
                    <Pressable
                        style={[styles.acceptButton, { backgroundColor: colors.actionBlue }]}
                        onPress={handleAcceptRequest}
                        disabled={isLoading}
                    >
                        {isAccepting ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text style={styles.acceptButtonText}>Chấp nhận</Text>
                        )}
                    </Pressable>
                )}
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
        backgroundColor: 'rgba(0,122,255,0.1)',
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
        marginLeft: Spacing.sm,
    },
    addButton: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: 20,
        minWidth: 90,
        alignItems: 'center',
    },
    addButtonText: {
        color: '#FFFFFF',
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.semibold,
    },
    acceptButton: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: 20,
        minWidth: 100,
        alignItems: 'center',
    },
    acceptButtonText: {
        color: '#FFFFFF',
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.semibold,
    },
    sentBadge: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: 20,
    },
    sentText: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.medium,
    },
});
