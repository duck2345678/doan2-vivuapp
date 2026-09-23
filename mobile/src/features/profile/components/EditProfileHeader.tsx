import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

export interface EditProfileHeaderProps {
    title: string;
    onCancel: () => void;
    onDone: () => void;
    cancelText?: string;
    doneText?: string;
    isDoneDisabled?: boolean;
    isLoading?: boolean;
}

export function EditProfileHeader({
    title,
    onCancel,
    onDone,
    cancelText = 'Hủy',
    doneText = 'Xong',
    isDoneDisabled = false,
    isLoading = false,
}: EditProfileHeaderProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];

    return (
        <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
            <Pressable
                style={styles.headerButton}
                onPress={onCancel}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                disabled={isLoading}
            >
                <Text
                    style={[
                        styles.cancelText,
                        { color: colors.textPrimary },
                        isLoading && styles.disabledText,
                    ]}
                >
                    {cancelText}
                </Text>
            </Pressable>

            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                {title}
            </Text>

            <Pressable
                style={styles.headerButton}
                onPress={onDone}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                disabled={isDoneDisabled || isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator
                        size="small"
                        color={colors.actionBlue}
                        style={styles.loadingIndicator}
                    />
                ) : (
                    <Text
                        style={[
                            styles.doneText,
                            { color: colors.actionBlue },
                            isDoneDisabled && styles.disabledText,
                        ]}
                    >
                        {doneText}
                    </Text>
                )}
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.screenPadding,
        paddingVertical: Spacing.md,
        borderBottomWidth: 0.8,
    },
    headerButton: {
        minWidth: 44,
        paddingVertical: Spacing.xs,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: Typography.sizes['17'],
        fontWeight: Typography.weights.semibold,
        flex: 1,
        textAlign: 'center',
    },
    cancelText: {
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.normal,
    },
    doneText: {
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.semibold,
        textAlign: 'right',
    },
    disabledText: {
        opacity: 0.5,
    },
    loadingIndicator: {
        alignSelf: 'flex-end',
    },
});
