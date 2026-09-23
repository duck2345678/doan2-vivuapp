/**
 * ProfileShareSheet Component
 * Bottom sheet with QR code for sharing profile
 */

import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import BottomSheet, {
    BottomSheetBackdrop,
    BottomSheetView,
} from '@gorhom/bottom-sheet';
import React, { forwardRef, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { buildShareUrl } from '../utils/profileShare';

export interface ProfileShareSheetProps {
    userId: number | string;
    displayName: string;
    qrViewRef: React.RefObject<View | null>;
    onCopyLink: () => void;
    onShare: () => void;
    onDownload: () => void;
    onScan: () => void;
}

export const ProfileShareSheet = forwardRef<BottomSheet, ProfileShareSheetProps>(
    ({ userId, displayName, qrViewRef, onCopyLink, onShare, onDownload, onScan }, ref) => {
        const colorScheme = useColorScheme() ?? 'light';
        const colors = Colors[colorScheme];

        const snapPoints = useMemo(() => ['55%'], []);
        const shareUrl = useMemo(() => buildShareUrl(userId), [userId]);

        const renderBackdrop = useCallback(
            (props: any) => (
                <BottomSheetBackdrop
                    {...props}
                    disappearsOnIndex={-1}
                    appearsOnIndex={0}
                    opacity={0.5}
                />
            ),
            []
        );

        return (
            <BottomSheet
                ref={ref}
                index={-1}
                snapPoints={snapPoints}
                enablePanDownToClose
                backdropComponent={renderBackdrop}
                backgroundStyle={[styles.background, { backgroundColor: colors.card }]}
                handleIndicatorStyle={[styles.indicator, { backgroundColor: colors.border }]}
            >
                <BottomSheetView style={styles.content}>
                    {/* QR Card */}
                    <View
                        ref={qrViewRef}
                        style={[
                            styles.qrCard,
                            {
                                backgroundColor: colors.background,
                                borderColor: colors.borderLight,
                            },
                        ]}
                        collapsable={false}
                    >
                        <View style={styles.qrWrapper}>
                            <QRCode
                                value={shareUrl}
                                size={160}
                                backgroundColor="transparent"
                                color={colors.text}
                            />
                            {/* @ Overlay in center */}
                            <View style={[styles.atOverlay, { backgroundColor: colors.background }]}>
                                <Text style={[styles.atSymbol, { color: colors.text }]}>@</Text>
                            </View>
                        </View>
                        <Text style={[styles.displayName, { color: colors.textPrimary }]}>
                            {displayName}
                        </Text>
                    </View>

                    {/* Quick Actions Row */}
                    <View style={styles.quickActionsRow}>
                        <Pressable
                            style={({ pressed }) => [
                                styles.quickAction,
                                pressed && styles.quickActionPressed,
                            ]}
                            onPress={onDownload}
                        >
                            <View style={[styles.quickActionIcon, { borderColor: colors.border }]}>
                                <Ionicons name="download-outline" size={22} color={colors.textPrimary} />
                            </View>
                            <Text style={[styles.quickActionLabel, { color: colors.textPrimary }]}>
                                Tải xuống
                            </Text>
                        </Pressable>

                        <Pressable
                            style={({ pressed }) => [
                                styles.quickAction,
                                pressed && styles.quickActionPressed,
                            ]}
                            onPress={onScan}
                        >
                            <View style={[styles.quickActionIcon, { borderColor: colors.border }]}>
                                <MaterialIcons name="qr-code-scanner" size={22} color={colors.textPrimary} />
                            </View>
                            <Text style={[styles.quickActionLabel, { color: colors.textPrimary }]}>
                                Quét
                            </Text>
                        </Pressable>
                    </View>

                    {/* Divider */}
                    <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

                    {/* List Actions */}
                    <View style={styles.listActions}>
                        <Pressable
                            style={({ pressed }) => [
                                styles.listAction,
                                pressed && { backgroundColor: colors.muted },
                            ]}
                            onPress={onCopyLink}
                        >
                            <View style={styles.listActionLeft}>
                                <Ionicons name="link-outline" size={20} color={colors.textPrimary} />
                                <Text style={[styles.listActionText, { color: colors.textPrimary }]}>
                                    Sao chép liên kết
                                </Text>
                            </View>
                        </Pressable>

                        <Pressable
                            style={({ pressed }) => [
                                styles.listAction,
                                pressed && { backgroundColor: colors.muted },
                            ]}
                            onPress={onShare}
                        >
                            <View style={styles.listActionLeft}>
                                <Ionicons name="share-social-outline" size={20} color={colors.textPrimary} />
                                <Text style={[styles.listActionText, { color: colors.textPrimary }]}>
                                    Chia sẻ lên
                                </Text>
                            </View>
                            <Ionicons name="arrow-up" size={18} color={colors.textSecondary} />
                        </Pressable>
                    </View>
                </BottomSheetView>
            </BottomSheet>
        );
    }
);

ProfileShareSheet.displayName = 'ProfileShareSheet';

const styles = StyleSheet.create({
    background: {
        borderTopLeftRadius: BorderRadius['2xl'],
        borderTopRightRadius: BorderRadius['2xl'],
        ...Shadows.lg,
    },
    indicator: {
        width: 40,
        height: 4,
        borderRadius: 2,
    },
    content: {
        flex: 1,
        paddingHorizontal: Spacing.screenPadding,
    },
    qrCard: {
        alignSelf: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.md,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        marginTop: Spacing.md,
        marginBottom: Spacing.lg,
    },
    qrWrapper: {
        position: 'relative',
        padding: Spacing.sm,
    },
    atOverlay: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -16 }, { translateY: -16 }],
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    atSymbol: {
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.bold,
    },
    displayName: {
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.medium,
        marginTop: Spacing.sm,
    },
    quickActionsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: Spacing['2xl'],
        marginBottom: Spacing.lg,
    },
    quickAction: {
        alignItems: 'center',
        gap: Spacing.xs,
    },
    quickActionPressed: {
        opacity: 0.7,
    },
    quickActionIcon: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickActionLabel: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.medium,
    },
    divider: {
        height: 1,
        marginBottom: Spacing.sm,
    },
    listActions: {
        gap: Spacing.xs,
    },
    listAction: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.sm,
        borderRadius: BorderRadius.md,
    },
    listActionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    listActionText: {
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.normal,
    },
});
