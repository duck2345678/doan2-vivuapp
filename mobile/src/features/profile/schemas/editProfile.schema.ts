import { z } from 'zod';

export const profileLinkSchema = z.object({
    id: z.string(),
    title: z.string().min(1, 'Tiêu đề không được để trống'),
    url: z.string().url('URL không hợp lệ'),
});

export const editProfileSchema = z.object({
    displayName: z
        .string()
        .min(1, 'Tên hiển thị không được để trống')
        .max(50, 'Tên hiển thị không được quá 50 ký tự'),
    bio: z
        .string()
        .max(150, 'Tiểu sử không được quá 150 ký tự')
        .optional()
        .or(z.literal('')),
    avatarUrl: z.string().optional(),
    coverUrl: z.string().optional(),
    interests: z
        .array(z.string())
        .max(10, 'Tối đa 10 sở thích')
        .optional()
        .transform(val => val ?? []),
    isPrivate: z.boolean().optional().transform(val => val ?? false),
});

export type EditProfileFormData = z.infer<typeof editProfileSchema>;
