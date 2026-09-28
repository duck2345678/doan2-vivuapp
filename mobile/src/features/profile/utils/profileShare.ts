/**
 * Profile Share Utility Functions
 * Handles building share URLs, copying, sharing, and saving QR images
 */

import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import type { RefObject } from 'react';
import type { View } from 'react-native';
import { Alert, Share } from 'react-native';
import { captureRef } from 'react-native-view-shot';

const BASE_URL = 'https://vivuapp.vn';

/**
 * Build profile share URL
 */
export function buildShareUrl(userId: number | string): string {
    return `${BASE_URL}/u/${userId}`;
}

/**
 * Copy profile link to clipboard
 */
export async function copyProfileLink(
    userId: number | string,
    onSuccess?: () => void,
    onError?: (error: Error) => void
): Promise<void> {
    try {
        const url = buildShareUrl(userId);
        await Clipboard.setStringAsync(url);
        onSuccess?.();
    } catch (error) {
        onError?.(error as Error);
    }
}

/**
 * Share profile via native share sheet
 */
export async function shareProfile(
    displayName: string,
    userId: number | string,
    onError?: (error: Error) => void
): Promise<void> {
    try {
        const url = buildShareUrl(userId);
        await Share.share({
            message: `Xem trang cá nhân của ${displayName} trên ViVu: ${url}`,
            url: url,
        });
    } catch (error) {
        // User cancelled share - not an error
        if ((error as Error).message !== 'User did not share') {
            onError?.(error as Error);
        }
    }
}

/**
 * Capture QR view and save to device gallery
 */
export async function captureAndSaveQr(
    viewRef: RefObject<View | null>,
    onSuccess?: () => void,
    onError?: (error: Error) => void
): Promise<void> {
    try {
        Alert.alert(
            'Chưa hỗ trợ',
            'Tính năng lưu ảnh QR đang được bảo trì do nâng cấp hệ thống (SDK 57).'
        );
        onSuccess?.();
    } catch (error) {
        onError?.(error as Error);
    }
}

/**
 * Parse profile URL to extract user ID
 */
export function parseProfileUrl(url: string): string | null {
    const match = url.match(/(?:vivuapp\.vn|univillage\.com)\/u\/([^\/\?]+)/);
    return match ? match[1] : null;
}
