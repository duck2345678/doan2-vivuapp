/**
 * ChangePasswordModal Component
 * Modal for changing user password with validation
 */

import { BorderRadius, Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import {
    changePassword,
    validatePassword,
    validatePasswordMatch,
} from '../services/changePassword';
import { BottomSheetModal } from './BottomSheetModal';

// Icon colors matching Figma
const ICON_COLORS = {
    background: '#eff6ff',
    tint: '#3b82f6',
};

interface ChangePasswordModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function ChangePasswordModal({
    visible,
    onClose,
    onSuccess,
}: ChangePasswordModalProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];

    // Form state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Visibility toggles
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Validation and loading state
    const [errors, setErrors] = useState<{
        currentPassword?: string;
        newPassword?: string;
        confirmPassword?: string;
        general?: string;
    }>({});
    const [isLoading, setIsLoading] = useState(false);

    // Reset form when modal closes
    const handleClose = () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setErrors({});
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        onClose();
    };

    // Validate form
    const validateForm = (): boolean => {
        const newErrors: typeof errors = {};

        if (!currentPassword) {
            newErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.';
        }

        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.isValid) {
            newErrors.newPassword = passwordValidation.error;
        }

        const matchValidation = validatePasswordMatch(newPassword, confirmPassword);
        if (!matchValidation.isValid) {
            newErrors.confirmPassword = matchValidation.error;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Check if form is valid for button state
    const isFormValid =
        currentPassword.length > 0 &&
        newPassword.length >= 6 &&
        confirmPassword === newPassword;

    // Handle confirm
    const handleConfirm = async () => {
        if (!validateForm()) return;

        setIsLoading(true);
        setErrors({});

        try {
            const result = await changePassword(currentPassword, newPassword);

            if (result.success) {
                if (onSuccess) {
                    onSuccess();
                } else {
                    handleClose();
                }
            } else {
                setErrors({ general: result.error });
            }
        } catch (error) {
            setErrors({ general: 'Đã xảy ra lỗi. Vui lòng thử lại.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <BottomSheetModal
            visible={visible}
            onClose={handleClose}
            title="Đổi mật khẩu"
            icon={
                <MaterialIcons
                    name="lock-outline"
                    size={20}
                    color={ICON_COLORS.tint}
                />
            }
            iconBackgroundColor={ICON_COLORS.background}
        >
            <View style={styles.container}>
                {/* General Error */}
                {errors.general && (
                    <View style={[styles.errorBanner, { backgroundColor: colors.error + '10' }]}>
                        <Text style={[styles.errorBannerText, { color: colors.error }]}>
                            {errors.general}
                        </Text>
                    </View>
                )}

                {/* Current Password */}
                <View style={styles.fieldContainer}>
                    <Text style={[styles.label, { color: colors.textPrimary }]}>
                        Mật khẩu hiện tại
                    </Text>
                    <View
                        style={[
                            styles.inputContainer,
                            { borderColor: errors.currentPassword ? colors.error : colors.borderLight },
                        ]}
                    >
                        <TextInput
                            style={[styles.input, { color: colors.textPrimary }]}
                            placeholder="Nhập mật khẩu hiện tại"
                            placeholderTextColor={colors.textSecondary}
                            secureTextEntry={!showCurrentPassword}
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <Pressable
                            style={styles.eyeButton}
                            onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                            <MaterialIcons
                                name={showCurrentPassword ? 'visibility' : 'visibility-off'}
                                size={20}
                                color={colors.textSecondary}
                            />
                        </Pressable>
                    </View>
                    {errors.currentPassword && (
                        <Text style={[styles.errorText, { color: colors.error }]}>
                            {errors.currentPassword}
                        </Text>
                    )}
                </View>

                {/* New Password */}
                <View style={styles.fieldContainer}>
                    <Text style={[styles.label, { color: colors.textPrimary }]}>
                        Mật khẩu mới
                    </Text>
                    <View
                        style={[
                            styles.inputContainer,
                            { borderColor: errors.newPassword ? colors.error : colors.borderLight },
                        ]}
                    >
                        <TextInput
                            style={[styles.input, { color: colors.textPrimary }]}
                            placeholder="Nhập mật khẩu mới"
                            placeholderTextColor={colors.textSecondary}
                            secureTextEntry={!showNewPassword}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <Pressable
                            style={styles.eyeButton}
                            onPress={() => setShowNewPassword(!showNewPassword)}
                        >
                            <MaterialIcons
                                name={showNewPassword ? 'visibility' : 'visibility-off'}
                                size={20}
                                color={colors.textSecondary}
                            />
                        </Pressable>
                    </View>
                    {errors.newPassword ? (
                        <Text style={[styles.errorText, { color: colors.error }]}>
                            {errors.newPassword}
                        </Text>
                    ) : (
                        <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                            Tối thiểu 6 ký tự
                        </Text>
                    )}
                </View>

                {/* Confirm Password */}
                <View style={styles.fieldContainer}>
                    <Text style={[styles.label, { color: colors.textPrimary }]}>
                        Xác nhận mật khẩu mới
                    </Text>
                    <View
                        style={[
                            styles.inputContainer,
                            { borderColor: errors.confirmPassword ? colors.error : colors.borderLight },
                        ]}
                    >
                        <TextInput
                            style={[styles.input, { color: colors.textPrimary }]}
                            placeholder="Nhập lại mật khẩu mới"
                            placeholderTextColor={colors.textSecondary}
                            secureTextEntry={!showConfirmPassword}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <Pressable
                            style={styles.eyeButton}
                            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                            <MaterialIcons
                                name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                                size={20}
                                color={colors.textSecondary}
                            />
                        </Pressable>
                    </View>
                    {errors.confirmPassword && (
                        <Text style={[styles.errorText, { color: colors.error }]}>
                            {errors.confirmPassword}
                        </Text>
                    )}
                </View>

                {/* Buttons */}
                <View style={styles.buttonContainer}>
                    {/* Cancel Button */}
                    <Pressable
                        style={[
                            styles.button,
                            styles.cancelButton,
                            { borderColor: colors.borderLight },
                        ]}
                        onPress={handleClose}
                    >
                        <Text style={[styles.cancelButtonText, { color: colors.textPrimary }]}>
                            Hủy
                        </Text>
                    </Pressable>

                    {/* Confirm Button */}
                    <Pressable
                        style={[
                            styles.button,
                            styles.confirmButton,
                            !isFormValid && styles.buttonDisabled,
                        ]}
                        onPress={handleConfirm}
                        disabled={!isFormValid || isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.confirmButtonText}>Xác nhận</Text>
                        )}
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
    errorBanner: {
        padding: Spacing.sm + 4,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.md,
    },
    errorBannerText: {
        fontSize: Typography.sizes.sm,
        textAlign: 'center',
    },
    fieldContainer: {
        marginBottom: Spacing.md,
    },
    label: {
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.medium,
        marginBottom: Spacing.xs + 2,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: BorderRadius.lg,
        backgroundColor: '#fff',
    },
    input: {
        flex: 1,
        paddingVertical: Spacing.sm + 4,
        paddingHorizontal: Spacing.md,
        fontSize: Typography.sizes.base,
    },
    eyeButton: {
        paddingHorizontal: Spacing.sm + 4,
        paddingVertical: Spacing.sm,
    },
    helperText: {
        fontSize: Typography.sizes.sm,
        marginTop: Spacing.xs,
    },
    errorText: {
        fontSize: Typography.sizes.sm,
        marginTop: Spacing.xs,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: Spacing.sm + 4,
        marginTop: Spacing.md,
    },
    button: {
        flex: 1,
        height: 48,
        borderRadius: BorderRadius.xl - 2, // 14px
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
    },
    cancelButtonText: {
        fontSize: Typography.sizes['15'],
        fontWeight: Typography.weights.semibold,
    },
    confirmButton: {
        backgroundColor: '#155dfc',
    },
    confirmButtonText: {
        fontSize: Typography.sizes['15'],
        fontWeight: Typography.weights.bold,
        color: '#fff',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
});
