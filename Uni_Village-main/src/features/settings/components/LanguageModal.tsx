/**
 * LanguageModal Component
 * Modal for selecting app language
 */

import { BorderRadius, Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LanguageCode, useSettingsStore } from '../store/settings.store';
import { BottomSheetModal } from './BottomSheetModal';

// Icon colors matching Figma
const ICON_COLORS = {
    background: '#eff6ff',
    tint: '#3b82f6',
};

interface LanguageOption {
    code: LanguageCode;
    name: string;
    flag: string;
}

const LANGUAGES: LanguageOption[] = [
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
];

interface LanguageModalProps {
    visible: boolean;
    onClose: () => void;
}

export function LanguageModal({ visible, onClose }: LanguageModalProps) {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];

    const { language, setLanguage } = useSettingsStore();

    const handleSelectLanguage = (code: LanguageCode) => {
        setLanguage(code);
        onClose();
    };

    return (
        <BottomSheetModal
            visible={visible}
            onClose={onClose}
            title={t('settings.languageModal.title')}
            icon={
                <MaterialIcons
                    name="language"
                    size={20}
                    color={ICON_COLORS.tint}
                />
            }
            iconBackgroundColor={ICON_COLORS.background}
        >
            <View style={styles.container}>
                {LANGUAGES.map((lang, index) => (
                    <View key={lang.code}>
                        <Pressable
                            style={({ pressed }) => [
                                styles.languageRow,
                                pressed && { opacity: 0.7 },
                                language === lang.code && [
                                    styles.selectedRow,
                                    { backgroundColor: colors.selectedChipBg },
                                ],
                            ]}
                            onPress={() => handleSelectLanguage(lang.code)}
                        >
                            <Text style={styles.flag}>{lang.flag}</Text>
                            <Text
                                style={[
                                    styles.languageName,
                                    { color: colors.textPrimary },
                                    language === lang.code && styles.selectedText,
                                ]}
                            >
                                {lang.name}
                            </Text>
                            {language === lang.code && (
                                <MaterialIcons
                                    name="check"
                                    size={20}
                                    color={colors.actionBlue}
                                    style={styles.checkIcon}
                                />
                            )}
                        </Pressable>
                        {index < LANGUAGES.length - 1 && (
                            <View
                                style={[
                                    styles.separator,
                                    { backgroundColor: colors.borderLight },
                                ]}
                            />
                        )}
                    </View>
                ))}
            </View>
        </BottomSheetModal>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.md,
    },
    languageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.lg,
    },
    selectedRow: {
        borderRadius: BorderRadius.lg,
    },
    flag: {
        fontSize: 28,
        marginRight: Spacing.sm + 4,
    },
    languageName: {
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.semibold,
        flex: 1,
    },
    selectedText: {
        fontWeight: Typography.weights.bold,
    },
    checkIcon: {
        marginLeft: Spacing.sm,
    },
    separator: {
        height: 1,
        marginLeft: Spacing.md + 40, // Align with text after flag
    },
});
