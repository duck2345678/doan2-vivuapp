/**
 * LoginScreen
 * Login screen with email/phone and password
 */

import { Colors } from '@/shared/constants/theme';
import { useColorScheme } from '@/shared/hooks';
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
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    AuthDivider,
    AuthHeader,
    AuthInput,
    PrimaryButton,
    SocialAuthButtons,
} from '../components';
import { useGoogleAuth } from '../hooks';
import { loginSchema, type LoginFormData } from '../schemas';
import { authService } from '../services';

export function LoginScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Google OAuth hook
    const { signInWithGoogle, isLoading: isGoogleLoading } = useGoogleAuth();

    const {
        control,
        handleSubmit,
        formState: { errors, isValid, dirtyFields },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        mode: 'onChange',
        defaultValues: {
            identifier: '',
            password: '',
        },
    });

    const onSubmit = useCallback(async (data: LoginFormData) => {
        setIsSubmitting(true);
        try {
            const result = await authService.login(
                data.identifier,
                data.password
            );

            if (result.success) {
                // Navigate to main app
                router.replace({ pathname: '/(tabs)/map' });
            } else {
                Alert.alert('Lỗi', result.message || 'Đã có lỗi xảy ra');
            }
        } catch (error) {
            console.error('Login error:', error);
            Alert.alert('Lỗi', 'Không thể đăng nhập. Vui lòng thử lại.');
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const handleForgotPassword = useCallback(() => {
        router.push('/(auth)/forgot-password');
    }, []);

    const handleRegister = useCallback(() => {
        router.push({ pathname: '/(auth)/register' });
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
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                >
                    {/* Header */}
                    <AuthHeader title="Đăng nhập" />

                    {/* Form */}
                    <View style={styles.form}>
                        {/* Email/Phone Input */}
                        <Controller
                            control={control}
                            name="identifier"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <AuthInput
                                    placeholder="Email / Số điện thoại"
                                    leftIconName="mail-outline"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    error={dirtyFields.identifier ? errors.identifier?.message : undefined}
                                />
                            )}
                        />

                        {/* Password Input */}
                        <Controller
                            control={control}
                            name="password"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <AuthInput
                                    placeholder="Mật khẩu"
                                    leftIconName="lock-closed-outline"
                                    isPassword
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    error={dirtyFields.password ? errors.password?.message : undefined}
                                />
                            )}
                        />

                        {/* Forgot Password Link */}
                        <Pressable
                            style={styles.forgotPasswordContainer}
                            onPress={handleForgotPassword}
                        >
                            <Text style={[styles.forgotPasswordText, { color: colors.authLinkText }]}>
                                Quên mật khẩu?
                            </Text>
                        </Pressable>

                        {/* Login Button */}
                        <PrimaryButton
                            title="Đăng nhập"
                            onPress={handleSubmit(onSubmit)}
                            disabled={!isValid}
                            loading={isSubmitting}
                        />
                    </View>

                    {/* Divider */}
                    <AuthDivider label="Hoặc đăng nhập bằng" />

                    {/* Social Buttons */}
                    <SocialAuthButtons
                        onGooglePress={signInWithGoogle}
                        isLoading={isGoogleLoading}
                    />

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                            Chưa có tài khoản?{' '}
                        </Text>
                        <Pressable onPress={handleRegister}>
                            <Text style={[styles.footerLink, { color: colors.authLinkText }]}>
                                Đăng ký
                            </Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 24,
        flexGrow: 1,
    },
    form: {
        gap: 4,
    },
    forgotPasswordContainer: {
        alignSelf: 'flex-end',
        marginBottom: 24,
        marginTop: 4,
    },
    forgotPasswordText: {
        fontSize: 14,
        fontWeight: '500',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 32,
    },
    footerText: {
        fontSize: 16,
    },
    footerLink: {
        fontSize: 16,
        fontWeight: '500',
    },
});
