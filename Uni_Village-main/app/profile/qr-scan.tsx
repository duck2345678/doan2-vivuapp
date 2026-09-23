/**
 * QR Scan Screen
 * Camera-based QR code scanner for profile URLs
 */

import { parseProfileUrl } from '@/features/profile/utils/profileShare';
import { BorderRadius, Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function QrScanScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);

    const handleBack = useCallback(() => {
        router.back();
    }, []);

    const handleBarcodeScanned = useCallback(
        ({ data }: { data: string }) => {
            if (scanned) return;
            setScanned(true);

            const userId = parseProfileUrl(data);
            if (userId) {
                // Navigate to the scanned profile
                router.replace(`/profile/${userId}`);
            } else {
                // Not a valid UniVillage profile URL
                setScanned(false);
            }
        },
        [scanned]
    );

    const handleRequestPermission = useCallback(async () => {
        await requestPermission();
    }, [requestPermission]);

    // Loading state
    if (!permission) {
        return (
            <SafeAreaView
                style={[styles.container, { backgroundColor: colors.background }]}
                edges={['top']}
            >
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.tint} />
                </View>
            </SafeAreaView>
        );
    }

    // Permission not granted
    if (!permission.granted) {
        return (
            <SafeAreaView
                style={[styles.container, { backgroundColor: colors.background }]}
                edges={['top']}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Pressable
                        style={styles.backButton}
                        onPress={handleBack}
                        hitSlop={8}
                    >
                        <Ionicons name="chevron-back" size={24} color={colors.text} />
                    </Pressable>
                    <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                        Quét mã QR
                    </Text>
                    <View style={styles.headerSpacer} />
                </View>

                {/* Permission Request */}
                <View style={styles.permissionContainer}>
                    <View style={[styles.iconCircle, { backgroundColor: colors.muted }]}>
                        <Ionicons name="camera-outline" size={48} color={colors.tint} />
                    </View>
                    <Text style={[styles.permissionTitle, { color: colors.textPrimary }]}>
                        Cần quyền truy cập Camera
                    </Text>
                    <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
                        Để quét mã QR, UniVillage cần quyền truy cập camera của bạn
                    </Text>
                    <Pressable
                        style={[styles.permissionButton, { backgroundColor: colors.tint }]}
                        onPress={handleRequestPermission}
                    >
                        <Text style={styles.permissionButtonText}>Cho phép truy cập</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    // Camera view
    return (
        <View style={styles.cameraContainer}>
            <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                }}
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />

            {/* Overlay */}
            <SafeAreaView style={styles.overlay} edges={['top']}>
                {/* Header */}
                <View style={styles.cameraHeader}>
                    <Pressable
                        style={styles.cameraBackButton}
                        onPress={handleBack}
                        hitSlop={8}
                    >
                        <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                    </Pressable>
                    <Text style={styles.cameraHeaderTitle}>Quét mã QR</Text>
                    <View style={styles.headerSpacer} />
                </View>

                {/* Scan Frame */}
                <View style={styles.scanFrameContainer}>
                    <View style={styles.scanFrame}>
                        {/* Corner indicators */}
                        <View style={[styles.corner, styles.topLeft]} />
                        <View style={[styles.corner, styles.topRight]} />
                        <View style={[styles.corner, styles.bottomLeft]} />
                        <View style={[styles.corner, styles.bottomRight]} />
                    </View>
                    <Text style={styles.scanHint}>
                        Hướng camera vào mã QR để quét
                    </Text>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.screenPadding,
        paddingVertical: Spacing.md,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.semibold,
        textAlign: 'center',
    },
    headerSpacer: {
        width: 40,
    },
    permissionContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing['2xl'],
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
    },
    permissionTitle: {
        fontSize: Typography.sizes.xl,
        fontWeight: Typography.weights.semibold,
        marginBottom: Spacing.sm,
        textAlign: 'center',
    },
    permissionText: {
        fontSize: Typography.sizes.md,
        textAlign: 'center',
        marginBottom: Spacing.xl,
        lineHeight: 22,
    },
    permissionButton: {
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        borderRadius: BorderRadius.lg,
    },
    permissionButtonText: {
        color: '#FFFFFF',
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.semibold,
    },
    cameraContainer: {
        flex: 1,
    },
    overlay: {
        flex: 1,
    },
    cameraHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.screenPadding,
        paddingVertical: Spacing.md,
    },
    cameraBackButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 20,
    },
    cameraHeaderTitle: {
        flex: 1,
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.semibold,
        textAlign: 'center',
        color: '#FFFFFF',
    },
    scanFrameContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scanFrame: {
        width: 250,
        height: 250,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderColor: '#FFFFFF',
        borderWidth: 3,
    },
    topLeft: {
        top: 0,
        left: 0,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        borderTopLeftRadius: 12,
    },
    topRight: {
        top: 0,
        right: 0,
        borderLeftWidth: 0,
        borderBottomWidth: 0,
        borderTopRightRadius: 12,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderRightWidth: 0,
        borderTopWidth: 0,
        borderBottomLeftRadius: 12,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        borderBottomRightRadius: 12,
    },
    scanHint: {
        marginTop: Spacing.xl,
        color: '#FFFFFF',
        fontSize: Typography.sizes.md,
        textAlign: 'center',
    },
});
