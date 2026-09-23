import React, { useCallback } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { useColorScheme } from '@/shared/hooks';
import { LocationPicker } from '@/features/map/components/LocationPicker';
import type { PostLocation } from '../types';

interface PostLocationPickerModalProps {
    isVisible: boolean;
    onClose: () => void;
    onSelect: (location: PostLocation) => void;
}

const getLocationName = (address: string) => {
    const parts = address.split(',');
    return parts[0]?.trim() || address;
};

export function PostLocationPickerModal({
    isVisible,
    onClose,
    onSelect,
}: PostLocationPickerModalProps) {
    const colorScheme = useColorScheme();

    const handleSelect = useCallback(
        (location: { latitude: number; longitude: number; address: string }) => {
            onSelect({
                id: `loc-${Date.now()}`,
                name: getLocationName(location.address),
                address: location.address,
                lat: location.latitude,
                lng: location.longitude,
            });
        },
        [onSelect]
    );

    return (
        <Modal visible={isVisible} animationType="slide" onRequestClose={onClose}>
            <View style={styles.container}>
                <LocationPicker
                    onLocationSelect={handleSelect}
                    onCancel={onClose}
                    colorScheme={colorScheme}
                />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
