import { z } from 'zod';

export const otpSchema = z.object({
    otp: z
        .string()
        .min(6, 'Mã OTP phải có 6 chữ số')
        .max(6, 'Mã OTP phải có 6 chữ số')
        .regex(/^\d+$/, 'Mã OTP chỉ chứa số'),
});

export type OTPFormData = z.infer<typeof otpSchema>;
