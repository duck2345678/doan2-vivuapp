/**
 * useProfileShareSheet Hook
 * Manages ProfileShareSheet ref and actions
 */

import BottomSheet from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import { useCallback, useRef } from 'react';
import type { View } from 'react-native';
import { Alert } from 'react-native';
import { captureAndSaveQr, copyProfileLink, shareProfile } from '../utils/profileShare';

export interface UseProfileShareSheetOptions {
    userId?: number | string;
    displayName?: string;
}

export function useProfileShareSheet(options: UseProfileShareSheetOptions) {
    const { userId, displayName } = options;
    const bottomSheetRef = useRef<BottomSheet>(null);
    const qrViewRef = useRef<View>(null);

    const open = useCallback(() => {
        bottomSheetRef.current?.expand();
    }, []);

    const close = useCallback(() => {
        bottomSheetRef.current?.close();
    }, []);

    const handleCopyLink = useCallback(() => {
        if (!userId) return;
        copyProfileLink(
            userId,
            () => {
                Alert.alert('Thành công', 'Đã sao chép liên kết vào clipboard!');
            },
            (error) => {
                Alert.alert('Lỗi', 'Không thể sao chép liên kết. Vui lòng thử lại.');
                console.error('Copy link error:', error);
            }
        );
    }, [userId]);

    const handleShare = useCallback(() => {
        if (!userId || !displayName) return;
        shareProfile(displayName, userId, (error) => {
            Alert.alert('Lỗi', 'Không thể chia sẻ. Vui lòng thử lại.');
            console.error('Share error:', error);
        });
    }, [userId, displayName]);

    const handleDownload = useCallback(() => {
        captureAndSaveQr(
            qrViewRef,
            () => {
                Alert.alert('Thành công', 'Đã lưu mã QR vào thư viện ảnh!');
            },
            (error) => {
                Alert.alert('Lỗi', 'Không thể lưu mã QR. Vui lòng thử lại.');
                console.error('Download QR error:', error);
            }
        );
    }, []);

    const handleScan = useCallback(() => {
        close();
        router.push('/profile/qr-scan');
    }, [close]);

    return {
        bottomSheetRef,
        qrViewRef,
        open,
        close,
        handleCopyLink,
        handleShare,
        handleDownload,
        handleScan,
    };
}
