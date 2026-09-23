/**
 * Auth Validation Schemas
 * Zod schemas for login and register form validation
 */

import { z } from 'zod';

export const loginSchema = z.object({
    identifier: z
        .string()
        .min(1, 'Vui lòng nhập email')
        .email('Email không hợp lệ'),
    password: z
        .string()
        .min(1, 'Vui lòng nhập mật khẩu'),
});

export const registerSchema = z.object({
    username: z
        .string()
        .min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự')
        .max(50, 'Tên đăng nhập không được quá 50 ký tự')
        .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'Tên đăng nhập phải bắt đầu bằng chữ cái và chỉ chứa chữ cái, số, dấu gạch dưới'),
    email: z
        .string()
        .min(1, 'Vui lòng nhập email')
        .email('Email không hợp lệ'),
    password: z
        .string()
        .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
        .regex(/[A-Z]/, 'Mật khẩu phải có ít nhất 1 chữ hoa')
        .regex(/[a-z]/, 'Mật khẩu phải có ít nhất 1 chữ thường')
        .regex(/[0-9]/, 'Mật khẩu phải có ít nhất 1 số'),
    confirmPassword: z
        .string()
        .min(1, 'Vui lòng xác nhận mật khẩu'),
    termsAccepted: z
        .boolean()
        .refine(val => val === true, 'Bạn phải đồng ý với điều khoản sử dụng'),
}).refine(data => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
