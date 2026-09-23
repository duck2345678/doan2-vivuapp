/**
 * LocationPermissionModal Component
 *
 * Modal dialog to handle location permission requests gracefully
 * Shows explanation for why location is needed and handles both states
 */

import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback } from 'react';
import {
    Linking,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export type LocationPermissionStatus =
    | 'undetermined'
    | 'denied'
    | 'granted'
    | 'restricted';

interface LocationPermissionModalProps {
    /** Whether modal is visible */
    visible: boolean;
    /** Current permission status */
    status: LocationPermissionStatus;
    /** Called when user requests permission */
    onRequestPermission: () => void;
    /** Called when user dismisses modal */
    onDismiss: () => void;
    /** Custom title */
    title?: string;
    /** Custom description */
    description?: string;
}

const LocationPermissionModalComponent: React.FC<LocationPermissionModalProps> = ({
    visible,
    status,
    onRequestPermission,
    onDismiss,
    title,
    description,
}) => {
    const isDenied = status === 'denied' || status === 'restricted';

    const handleOpenSettings = useCallback(() => {
        if (Platform.OS === 'ios') {
            Linking.openURL('app-settings:');
        } else {
            Linking.openSettings();
        }
        onDismiss();
    }, [onDismiss]);

    const defaultTitle = isDenied
        ? 'Cho phép truy cập vị trí'
        : 'Cần quyền truy cập vị trí';

    const defaultDescription = isDenied
        ? 'Để sử dụng tính năng bản đồ, bạn cần cho phép ứng dụng truy cập vị trí trong Cài đặt.'
        : 'Ứng dụng cần quyền truy cập vị trí để hiển thị vị trí của bạn trên bản đồ và tìm kiếm địa điểm gần đây.';

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onDismiss}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Icon */}
                    <View style={styles.iconContainer}>
                        <Ionicons
                            name={isDenied ? 'settings-outline' : 'location'}
                            size={48}
                            color="#3B82F6"
                        />
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>
                        {title || defaultTitle}
                    </Text>

                    {/* Description */}
                    <Text style={styles.description}>
                        {description || defaultDescription}
                    </Text>

                    {/* Actions */}
                    <View style={styles.actions}>
                        {isDenied ? (
                            <>
                                <TouchableOpacity
                                    style={[styles.button, styles.secondaryButton]}
                                    onPress={onDismiss}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.secondaryButtonText}>
                                        Để sau
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.button, styles.primaryButton]}
                                    onPress={handleOpenSettings}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="settings" size={18} color="#FFF" />
                                    <Text style={styles.primaryButtonText}>
                                        Mở Cài đặt
                                    </Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <TouchableOpacity
                                    style={[styles.button, styles.secondaryButton]}
                                    onPress={onDismiss}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.secondaryButtonText}>
                                        Không cho phép
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.button, styles.primaryButton]}
                                    onPress={onRequestPermission}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="location" size={18} color="#FFF" />
                                    <Text style={styles.primaryButtonText}>
                                        Cho phép
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    container: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 12,
    },
    description: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    button: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 6,
    },
    primaryButton: {
        backgroundColor: '#3B82F6',
    },
    secondaryButton: {
        backgroundColor: '#F3F4F6',
    },
    primaryButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFF',
    },
    secondaryButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6B7280',
    },
});

export const LocationPermissionModal = memo(LocationPermissionModalComponent);
