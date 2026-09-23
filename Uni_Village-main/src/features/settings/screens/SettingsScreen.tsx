/**
 * SettingsScreen Component
 * Main settings screen matching Figma node 520:3
 */

import { useAuthStore } from '@/features/auth';
import { queryClient } from '@/providers/QueryProvider';
import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Href, router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogoutCard } from '../components/LogoutCard';
import { SettingsRow } from '../components/SettingsRow';
import { SettingsSectionCard } from '../components/SettingsSectionCard';
import { useSettingsStore } from '../store/settings.store';

// Icon tile background colors (pastel) from Figma
const ICON_COLORS = {
    password: '#eff6ff', // Blue pastel
    language: '#eff6ff', // Blue pastel
    darkMode: '#fffbeb', // Yellow/amber pastel
    privacy: '#dcfce7', // Green pastel
    help: '#f3e8ff', // Purple pastel
    about: '#eff6ff', // Blue pastel
};

// Icon colors
const ICON_TINTS = {
    password: '#3b82f6',
    language: '#3b82f6',
    darkMode: '#f59e0b',
    privacy: '#22c55e',
    help: '#a855f7',
    about: '#3b82f6',
};

export function SettingsScreen() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];

    // Settings store
    const { darkMode, privatePosts, language, setDarkMode, setPrivatePosts } =
        useSettingsStore();

    // Auth store for logout
    const authClear = useAuthStore((state) => state.clear);

    // Handlers
    const handleBack = () => {
        router.back();
    };

    const handleChangePassword = () => {
        router.push('/settings/change-password' as Href);
    };

    const handleLanguage = () => {
        router.push('/settings/language' as Href);
    };

    const handleHelp = () => {
        router.push('/settings/help' as Href);
    };

    const handleAbout = () => {
        router.push('/settings/about' as Href);
    };

    const handleLogout = async () => {
        try {
            // Clear all cached data from React Query to prevent stale user data
            queryClient.clear();
            await authClear();
            router.replace('/');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    // Get subtitle for dark mode based on current state
    const darkModeSubtitle = darkMode
        ? t('settings.rows.darkModeOn')
        : t('settings.rows.darkModeOff');

    // Get subtitle for privacy based on current state
    const privacySubtitle = privatePosts
        ? t('settings.rows.privatePostsOn')
        : t('settings.rows.privatePostsOff');

    // Get subtitle for language
    const languageName = language === 'vi' ? 'Tiếng Việt' : 'English';
    const languageSubtitle = t('settings.rows.languageCurrent', { language: languageName });

    return (
        <SafeAreaView
            style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}
            edges={['top']}
        >
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.background }]}>
                <Pressable
                    style={styles.backButton}
                    onPress={handleBack}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <MaterialIcons name="chevron-left" size={28} color={colors.text} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                    {t('settings.title')}
                </Text>
                <View style={styles.headerSpacer} />
            </View>

            {/* Subtle header divider */}
            <View style={[styles.headerDivider, { backgroundColor: colors.borderLight }]} />

            {/* Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Section A: TÀI KHOẢN & BẢO MẬT */}
                <SettingsSectionCard title={t('settings.sections.account')}>
                    <SettingsRow
                        type="navigation"
                        icon={
                            <MaterialIcons
                                name="lock-outline"
                                size={20}
                                color={ICON_TINTS.password}
                            />
                        }
                        iconBackgroundColor={ICON_COLORS.password}
                        title={t('settings.rows.changePassword')}
                        subtitle={t('settings.rows.changePasswordDesc')}
                        onPress={handleChangePassword}
                    />
                    <SettingsRow
                        type="navigation"
                        icon={
                            <MaterialIcons
                                name="language"
                                size={20}
                                color={ICON_TINTS.language}
                            />
                        }
                        iconBackgroundColor={ICON_COLORS.language}
                        title={t('settings.rows.language')}
                        subtitle={languageSubtitle}
                        onPress={handleLanguage}
                    />
                </SettingsSectionCard>

                {/* Section B: GIAO DIỆN & HIỂN THỊ */}
                <SettingsSectionCard title={t('settings.sections.display')}>
                    <SettingsRow
                        type="toggle"
                        icon={
                            <MaterialIcons
                                name="brightness-6"
                                size={20}
                                color={ICON_TINTS.darkMode}
                            />
                        }
                        iconBackgroundColor={ICON_COLORS.darkMode}
                        title={t('settings.rows.darkMode')}
                        subtitle={darkModeSubtitle}
                        value={darkMode}
                        onValueChange={setDarkMode}
                    />
                </SettingsSectionCard>

                {/* Section C: QUYỀN RIÊNG TƯ */}
                <SettingsSectionCard title={t('settings.sections.privacy')}>
                    <SettingsRow
                        type="toggle"
                        icon={
                            <MaterialIcons
                                name="visibility-off"
                                size={20}
                                color={ICON_TINTS.privacy}
                            />
                        }
                        iconBackgroundColor={ICON_COLORS.privacy}
                        title={t('settings.rows.privatePosts')}
                        subtitle={privacySubtitle}
                        value={privatePosts}
                        onValueChange={setPrivatePosts}
                    />
                </SettingsSectionCard>

                {/* Section D: HỖ TRỢ */}
                <SettingsSectionCard title={t('settings.sections.support')}>
                    <SettingsRow
                        type="navigation"
                        icon={
                            <MaterialIcons
                                name="help-outline"
                                size={20}
                                color={ICON_TINTS.help}
                            />
                        }
                        iconBackgroundColor={ICON_COLORS.help}
                        title={t('settings.rows.help')}
                        subtitle={t('settings.rows.helpDesc')}
                        onPress={handleHelp}
                    />
                    <SettingsRow
                        type="navigation"
                        icon={
                            <MaterialIcons
                                name="info-outline"
                                size={20}
                                color={ICON_TINTS.about}
                            />
                        }
                        iconBackgroundColor={ICON_COLORS.about}
                        title={t('settings.rows.about')}
                        subtitle={t('settings.rows.aboutDesc')}
                        onPress={handleAbout}
                    />
                </SettingsSectionCard>

                {/* Logout Card */}
                <LogoutCard onLogout={handleLogout} />

                {/* Bottom spacing */}
                <View style={styles.bottomSpacer} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.sm,
    },
    backButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: Typography.sizes.xl,
        fontWeight: Typography.weights.bold,
    },
    headerSpacer: {
        width: 44,
    },
    headerDivider: {
        height: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.md,
    },
    bottomSpacer: {
        height: Spacing.xl,
    },
});
