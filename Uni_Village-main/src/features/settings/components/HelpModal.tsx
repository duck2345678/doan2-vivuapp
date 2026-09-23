/**
 * HelpModal Component
 * Modal for help and support contact information
 */

import { BorderRadius, Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheetModal } from './BottomSheetModal';

// Design colors from Figma
const DESIGN_COLORS = {
    iconBackground: '#f3e8ff',
    iconTint: '#a855f7',
    infoBorder: '#f97316',
    infoBackground: '#fff7ed',
    infoIconColor: '#f97316',
    contactBackground: '#f9fafb',
    responseBackground: '#dcfce7',
    responseText: '#22c55e',
    responseIcon: '#22c55e',
    emailLink: '#155dfc',
    orangeButton: '#f97316',
};

const SUPPORT_EMAIL = 'admin@univillage.com';

interface HelpModalProps {
    visible: boolean;
    onClose: () => void;
}

export function HelpModal({ visible, onClose }: HelpModalProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];
    const [copied, setCopied] = useState(false);

    const handleCopyEmail = async () => {
        await Clipboard.setStringAsync(SUPPORT_EMAIL);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSendEmail = () => {
        Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
    };

    return (
        <BottomSheetModal
            visible={visible}
            onClose={onClose}
            title="Trợ giúp"
            icon={
                <MaterialIcons
                    name="help-outline"
                    size={20}
                    color={DESIGN_COLORS.iconTint}
                />
            }
            iconBackgroundColor={DESIGN_COLORS.iconBackground}
        >
            <View style={styles.container}>
                {/* Info Card */}
                <View
                    style={[
                        styles.infoCard,
                        {
                            borderColor: DESIGN_COLORS.infoBorder,
                            backgroundColor: DESIGN_COLORS.infoBackground,
                        },
                    ]}
                >
                    <View style={styles.infoHeader}>
                        <MaterialIcons
                            name="support-agent"
                            size={24}
                            color={DESIGN_COLORS.infoIconColor}
                        />
                        <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>
                            Chúng tôi sẵn sàng hỗ trợ bạn!
                        </Text>
                    </View>
                    <Text style={[styles.infoDescription, { color: colors.textSecondary }]}>
                        Nếu bạn cần hỗ trợ hoặc có bất kỳ thắc mắc nào, đừng ngần ngại liên hệ
                        với chúng tôi.
                    </Text>
                </View>

                {/* Section Title */}
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                    THÔNG TIN LIÊN HỆ
                </Text>

                {/* Email Contact Card */}
                <View
                    style={[
                        styles.contactCard,
                        { backgroundColor: DESIGN_COLORS.contactBackground },
                    ]}
                >
                    <View style={styles.contactRow}>
                        <MaterialIcons
                            name="email"
                            size={20}
                            color={colors.textSecondary}
                        />
                        <View style={styles.contactText}>
                            <Text style={[styles.contactLabel, { color: colors.textPrimary }]}>
                                Email hỗ trợ
                            </Text>
                            <Text style={[styles.emailLink, { color: DESIGN_COLORS.emailLink }]}>
                                {SUPPORT_EMAIL}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Response Time Card */}
                <View
                    style={[
                        styles.responseCard,
                        { backgroundColor: DESIGN_COLORS.responseBackground },
                    ]}
                >
                    <View style={styles.contactRow}>
                        <MaterialIcons
                            name="phone"
                            size={20}
                            color={DESIGN_COLORS.responseIcon}
                        />
                        <View style={styles.contactText}>
                            <Text style={[styles.contactLabel, { color: colors.textPrimary }]}>
                                Thời gian phản hồi
                            </Text>
                            <Text style={[styles.responseTime, { color: DESIGN_COLORS.responseText }]}>
                                Trong vòng 24 giờ
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Buttons */}
                <View style={styles.buttonContainer}>
                    {/* Copy Email Button */}
                    <Pressable
                        style={[
                            styles.button,
                            styles.copyButton,
                            { borderColor: colors.borderLight },
                        ]}
                        onPress={handleCopyEmail}
                    >
                        <MaterialIcons
                            name={copied ? 'check' : 'content-copy'}
                            size={16}
                            color={colors.textPrimary}
                        />
                        <Text style={[styles.copyButtonText, { color: colors.textPrimary }]}>
                            {copied ? 'Đã sao chép' : 'Sao chép email'}
                        </Text>
                    </Pressable>

                    {/* Send Email Button */}
                    <Pressable
                        style={[
                            styles.button,
                            styles.sendButton,
                            { backgroundColor: DESIGN_COLORS.orangeButton },
                        ]}
                        onPress={handleSendEmail}
                    >
                        <MaterialIcons name="send" size={16} color="#fff" />
                        <Text style={styles.sendButtonText}>Gửi email</Text>
                    </Pressable>
                </View>
            </View>
        </BottomSheetModal>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingTop: Spacing.sm,
    },
    infoCard: {
        borderWidth: 1,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.xs + 2,
    },
    infoTitle: {
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.bold,
    },
    infoDescription: {
        fontSize: Typography.sizes.md,
        lineHeight: 20,
    },
    sectionTitle: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.semibold,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: Spacing.sm,
    },
    contactCard: {
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
    },
    responseCard: {
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm + 4,
    },
    contactText: {
        flex: 1,
    },
    contactLabel: {
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.medium,
        marginBottom: 2,
    },
    emailLink: {
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.semibold,
    },
    responseTime: {
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.bold,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: Spacing.sm + 4,
    },
    button: {
        flex: 1,
        height: 44,
        borderRadius: BorderRadius.xl - 2, // 14px
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs + 2,
    },
    copyButton: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
    },
    copyButtonText: {
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.semibold,
    },
    sendButton: {},
    sendButtonText: {
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.bold,
        color: '#fff',
    },
});
