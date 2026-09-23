/**
 * Change Password Service
 * Stub implementation for UI testing - TODO: Wire up Firebase Auth later
 */

export interface ChangePasswordResult {
    success: boolean;
    error?: string;
}

/**
 * Change user password
 * TODO: Integrate with Firebase Auth when ready
 * @param currentPassword - User's current password for re-authentication
 * @param newPassword - New password to set
 * @returns Promise with success status and optional error message
 */
export async function changePassword(
    currentPassword: string,
    newPassword: string
): Promise<ChangePasswordResult> {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // TODO: Implement actual Firebase Auth integration
    // For now, simulate success for UI testing
    console.log('changePassword called with:', { currentPassword: '***', newPassword: '***' });

    // Simulate success
    return { success: true };
}

/**
 * Validate password requirements
 * @param password - Password to validate
 * @returns Validation result with isValid and optional error message
 */
export function validatePassword(password: string): {
    isValid: boolean;
    error?: string;
} {
    if (password.length < 6) {
        return {
            isValid: false,
            error: 'Mật khẩu phải có ít nhất 6 ký tự.',
        };
    }

    return { isValid: true };
}

/**
 * Validate password confirmation
 * @param password - Original password
 * @param confirmPassword - Confirmation password
 * @returns Validation result
 */
export function validatePasswordMatch(
    password: string,
    confirmPassword: string
): { isValid: boolean; error?: string } {
    if (password !== confirmPassword) {
        return {
            isValid: false,
            error: 'Mật khẩu xác nhận không khớp.',
        };
    }

    return { isValid: true };
}
