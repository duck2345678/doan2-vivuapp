import { MaterialIcons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import { AuthHeader, PrimaryButton } from '../components';
import { useVerifyRegisterOtp, useVerifyForgotPasswordOtp, useRegister, useForgotPassword } from '../hooks';
import { otpSchema, type OTPFormData } from '../schemas';

export function OTPVerificationScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const params = useLocalSearchParams<{ email: string; flowType: 'register' | 'forgot-password' }>();
    
    const email = params.email || '';
    const flowType = params.flowType || 'register';
    
    const [isResending, setIsResending] = useState(false);
    const inputRefs = useRef<(TextInput | null)[]>([]);
    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);

    const { mutate: verifyRegister, isPending: isVerifyingRegister } = useVerifyRegisterOtp();
    const { mutate: verifyForgotPassword, isPending: isVerifyingForgot } = useVerifyForgotPasswordOtp();
    const { mutate: resendRegisterOtp, isPending: isResendingRegister } = useRegister();
    const { mutate: resendForgotOtp, isPending: isResendingForgot } = useForgotPassword();

    const isVerifying = isVerifyingRegister || isVerifyingForgot;
    const isResendingOtp = isResendingRegister || isResendingForgot;

    const {
        control,
        handleSubmit,
        setValue,
        formState: { errors, isValid },
    } = useForm<OTPFormData>({
        resolver: zodResolver(otpSchema),
        mode: 'onChange',
        defaultValues: {
            otp: '',
        },
    });

    const handleOtpChange = useCallback(
        (text: string, index: number) => {
            const newOtpDigits = [...otpDigits];
            newOtpDigits[index] = text;
            setOtpDigits(newOtpDigits);

            const fullOtp = newOtpDigits.join('');
            setValue('otp', fullOtp, { shouldValidate: true });

            if (text && index < 5) {
                inputRefs.current[index + 1]?.focus();
            }
        },
        [otpDigits, setValue]
    );

    const handleKeyPress = useCallback(
        (key: string, index: number) => {
            if (key === 'Backspace' && !otpDigits[index] && index > 0) {
                inputRefs.current[index - 1]?.focus();
            }
        },
        [otpDigits]
    );

    const onSubmit = useCallback(
        async (data: OTPFormData) => {
            const verifyData = { email, otp: data.otp };

            if (flowType === 'register') {
                verifyRegister(verifyData, {
                    onSuccess: () => {
                        Alert.alert('Thành công', 'Đăng ký thành công!', [
                            {
                                text: 'OK',
                                onPress: () => router.replace('/(tabs)/map'),
                            },
                        ]);
                    },
                    onError: (error: any) => {
                        Alert.alert('Lỗi', error?.message || 'Mã OTP không đúng');
                    },
                });
            } else {
                verifyForgotPassword(verifyData, {
                    onSuccess: () => {
                        Alert.alert('Thành công', 'Đặt lại mật khẩu thành công!', [
                            {
                                text: 'OK',
                                onPress: () => router.replace('/(auth)/login'),
                            },
                        ]);
                    },
                    onError: (error: any) => {
                        Alert.alert('Lỗi', error?.message || 'Mã OTP không đúng');
                    },
                });
            }
        },
        [email, flowType, verifyRegister, verifyForgotPassword]
    );

    const handleResendOtp = useCallback(async () => {
        setIsResending(true);
        
        if (flowType === 'register') {
            Alert.alert('Thông báo', 'Chức năng gửi lại OTP cho đăng ký cần thông tin đầy đủ. Vui lòng quay lại màn hình đăng ký.');
        } else {
            Alert.alert('Thông báo', 'Chức năng gửi lại OTP cho quên mật khẩu cần thông tin đầy đủ. Vui lòng quay lại màn hình quên mật khẩu.');
        }
        
        setIsResending(false);
    }, [flowType]);

    const handleBack = useCallback(() => {
        router.back();
    }, []);

    const title = flowType === 'register' ? 'Xác thực tài khoản' : 'Xác thực đặt lại mật khẩu';
    const subtitle = `Nhập mã OTP đã được gửi đến\n${email}`;

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

                    <AuthHeader title={title} subtitle={subtitle} />

                    <View style={styles.formContainer}>
                        <View style={styles.otpContainer}>
                            {[0, 1, 2, 3, 4, 5].map((index) => (
                                <Controller
                                    key={index}
                                    control={control}
                                    name="otp"
                                    render={() => (
                                        <TextInput
                                            ref={(ref) => (inputRefs.current[index] = ref)}
                                            style={[
                                                styles.otpInput,
                                                {
                                                    backgroundColor: colors.inputBackground,
                                                    borderColor: otpDigits[index]
                                                        ? colors.authLinkText
                                                        : colors.border,
                                                    color: colors.text,
                                                },
                                            ]}
                                            keyboardType="number-pad"
                                            maxLength={1}
                                            value={otpDigits[index]}
                                            onChangeText={(text) => handleOtpChange(text, index)}
                                            onKeyPress={({ nativeEvent }) =>
                                                handleKeyPress(nativeEvent.key, index)
                                            }
                                            selectTextOnFocus
                                        />
                                    )}
                                />
                            ))}
                        </View>

                        {errors.otp && (
                            <Text style={[styles.errorText, { color: colors.error }]}>
                                {errors.otp.message}
                            </Text>
                        )}

                        <PrimaryButton
                            title="Xác thực"
                            onPress={handleSubmit(onSubmit)}
                            loading={isVerifying}
                            disabled={!isValid || isVerifying}
                            style={styles.submitButton}
                        />

                        <View style={styles.resendContainer}>
                            <Text style={[styles.resendText, { color: colors.textSecondary }]}>
                                Không nhận được mã?
                            </Text>
                            <Pressable onPress={handleResendOtp} disabled={isResending || isResendingOtp}>
                                <Text
                                    style={[
                                        styles.resendLink,
                                        {
                                            color: isResending || isResendingOtp
                                                ? colors.textSecondary
                                                : colors.authLinkText,
                                        },
                                    ]}
                                >
                                    {isResending || isResendingOtp ? 'Đang gửi...' : 'Gửi lại'}
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
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.lg,
        gap: Spacing.sm,
    },
    otpInput: {
        flex: 1,
        height: 56,
        borderWidth: 2,
        borderRadius: 12,
        fontSize: 24,
        fontWeight: '600',
        textAlign: 'center',
    },
    errorText: {
        fontSize: Typography.sizes.sm,
        marginTop: -Spacing.md,
        marginBottom: Spacing.md,
        textAlign: 'center',
    },
    submitButton: {
        marginTop: Spacing.md,
    },
    resendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: Spacing.lg,
        gap: Spacing.xs,
    },
    resendText: {
        fontSize: Typography.sizes.base,
    },
    resendLink: {
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.semibold,
    },
});
