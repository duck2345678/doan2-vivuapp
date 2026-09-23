import { MaterialIcons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import { AuthHeader, AuthInput, PrimaryButton } from '../components';
import { useForgotPassword } from '../hooks';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '../schemas';

export function ForgotPasswordScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { mutate: forgotPassword, isPending } = useForgotPassword();

    const {
        control,
        handleSubmit,
        formState: { errors, isValid },
    } = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
        mode: 'onChange',
        defaultValues: {
            email: '',
            newPassword: '',
            confirmPassword: '',
        },
    });

    const onSubmit = useCallback(
        async (data: ForgotPasswordFormData) => {
            setIsSubmitting(true);
            
            forgotPassword(
                {
                    email: data.email,
                    newPassword: data.newPassword,
                    confirmPassword: data.confirmPassword,
                },
                {
                    onSuccess: (response) => {
                        Alert.alert(
                            'Thành công',
                            response.message || 'Mã OTP đã được gửi đến email của bạn',
                            [
                                {
                                    text: 'OK',
                                    onPress: () => {
                                        router.push({
                                            pathname: '/(auth)/verify-otp',
                                            params: {
                                                email: data.email,
                                                flowType: 'forgot-password',
                                            },
                                        });
                                    },
                                },
                            ]
                        );
                    },
                    onError: (error: any) => {
                        Alert.alert('Lỗi', error?.message || 'Không thể gửi mã OTP');
                        setIsSubmitting(false);
                    },
                }
            );
        },
        [forgotPassword]
    );

    const handleBack = useCallback(() => {
        router.back();
    }, []);

    return (
        <SafeAreaView
            style={[styles.container, { backgroundColor: colors.background }]}
            edges={['top', 'bottom']}
        >
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    style={styles.flex}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <Pressable onPress={handleBack} style={styles.backButton}>
                        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
                    </Pressable>

                    <AuthHeader
                        title="Quên mật khẩu"
                        subtitle="Nhập email và mật khẩu mới của bạn"
                    />

                    <View style={styles.formContainer}>
                        <Controller
                            control={control}
                            name="email"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <AuthInput
                                    label="Email"
                                    placeholder="example@email.com"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    error={errors.email?.message}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoComplete="email"
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="newPassword"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <AuthInput
                                    label="Mật khẩu mới"
                                    placeholder="Nhập mật khẩu mới"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    error={errors.newPassword?.message}
                                    secureTextEntry
                                    autoCapitalize="none"
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="confirmPassword"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <AuthInput
                                    label="Xác nhận mật khẩu"
                                    placeholder="Nhập lại mật khẩu mới"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    error={errors.confirmPassword?.message}
                                    secureTextEntry
                                    autoCapitalize="none"
                                />
                            )}
                        />

                        <PrimaryButton
                            title="Gửi mã OTP"
                            onPress={handleSubmit(onSubmit)}
                            loading={isPending || isSubmitting}
                            disabled={!isValid || isPending || isSubmitting}
                            style={styles.submitButton}
                        />

                        <View style={styles.loginContainer}>
                            <Text style={[styles.loginText, { color: colors.textSecondary }]}>
                                Nhớ mật khẩu?
                            </Text>
                            <Pressable onPress={() => router.push('/(auth)/login')}>
                                <Text style={[styles.loginLink, { color: colors.authLinkText }]}>
                                    Đăng nhập
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    flex: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: Spacing.screenPadding,
    },
    backButton: {
        marginTop: Spacing.md,
        marginBottom: Spacing.sm,
    },
    formContainer: {
        marginTop: Spacing.xl,
    },
    submitButton: {
        marginTop: Spacing.md,
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: Spacing.lg,
        gap: Spacing.xs,
    },
    loginText: {
        fontSize: 14,
    },
    loginLink: {
        fontSize: 14,
        fontWeight: '600',
    },
});
