/**
 * Profile Share Utility Functions
 * Handles building share URLs, copying, sharing, and saving QR images
 */

import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import type { RefObject } from 'react';
import type { View } from 'react-native';
import { Alert, Share } from 'react-native';
import { captureRef } from 'react-native-view-shot';

const BASE_URL = 'https://univillage.com';

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
            message: `Xem trang cá nhân của ${displayName} trên UniVillage: ${url}`,
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
        // Request permission
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(
                'Quyền truy cập bị từ chối',
                'Vui lòng cho phép truy cập thư viện ảnh để lưu mã QR.'
            );
            return;
        }

        // Capture view as image
        if (!viewRef.current) {
            throw new Error('QR view not found');
        }

        const uri = await captureRef(viewRef.current, {
            format: 'png',
            quality: 1,
        });

        // Save to gallery
        const asset = await MediaLibrary.createAssetAsync(uri);
        await MediaLibrary.createAlbumAsync('UniVillage', asset, false);

        // Clean up temp file
        await FileSystem.deleteAsync(uri, { idempotent: true });

        onSuccess?.();
    } catch (error) {
        onError?.(error as Error);
    }
}

/**
 * Parse profile URL to extract user ID
 */
export function parseProfileUrl(url: string): string | null {
    const match = url.match(/univillage\.com\/u\/([^\/\?]+)/);
    return match ? match[1] : null;
}
