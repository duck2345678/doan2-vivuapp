/**
 * Toast Utility
 * Simple notification system using Alert
 * Can be replaced with a proper toast library (e.g., react-native-toast-message)
 */
import { Alert, Platform } from 'react-native';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
    title?: string;
    message: string;
    type?: ToastType;
    duration?: number;
}

/**
 * Show a toast notification
 * Uses Alert.alert on both platforms for consistency
 * In production, replace with a proper toast library
 */
export function showToast({ title, message, type = 'info' }: ToastOptions): void {
    const defaultTitles: Record<ToastType, string> = {
        success: 'Thành công',
        error: 'Lỗi',
        info: 'Thông báo',
        warning: 'Cảnh báo',
    };

    const finalTitle = title || defaultTitles[type];

    if (Platform.OS === 'ios') {
        Alert.alert(finalTitle, message);
    } else {
        Alert.alert(finalTitle, message);
    }
}

/**
 * Show success toast
 */
export function showSuccessToast(message: string, title?: string): void {
    showToast({ title, message, type: 'success' });
}

/**
 * Show error toast
 */
export function showErrorToast(message: string, title?: string): void {
    showToast({ title, message, type: 'error' });
}

/**
 * Show info toast
 */
export function showInfoToast(message: string, title?: string): void {
    showToast({ title, message, type: 'info' });
}

/**
 * Show warning toast
 */
export function showWarningToast(message: string, title?: string): void {
    showToast({ title, message, type: 'warning' });
}

/**
 * Handle API errors and show appropriate toast
 */
export function handleApiError(error: unknown, operation: string = 'Thao tác'): void {
    console.error(`[API Error] ${operation} failed:`, error);

    const err = error as any;

    if (err?.response?.status === 404) {
        showErrorToast('Không tìm thấy dữ liệu');
    } else if (err?.response?.status === 403) {
        showErrorToast('Bạn không có quyền thực hiện thao tác này');
    } else if (err?.response?.status === 401) {
        showErrorToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    } else if (err?.response?.status === 500) {
        showErrorToast('Lỗi máy chủ. Vui lòng thử lại sau.');
    } else if (err?.message === 'Network Error') {
        showErrorToast('Không có kết nối mạng. Vui lòng kiểm tra kết nối internet.');
    } else {
        showErrorToast(`${operation} không thành công. Vui lòng thử lại.`);
    }
}
