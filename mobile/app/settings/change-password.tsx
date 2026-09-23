/**
 * Change Password Route
 * Renders the Change Password modal as a screen
 */

import { ChangePasswordModal } from '@/features/settings/components/ChangePasswordModal';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

export default function ChangePasswordRoute() {
    const [visible, setVisible] = useState(false);

    // Show modal on mount
    useEffect(() => {
        setVisible(true);
    }, []);

    const handleClose = () => {
        setVisible(false);
        // Navigate back after animation
        setTimeout(() => {
            router.back();
        }, 200);
    };

    const handleSuccess = () => {
        Alert.alert('Thành công', 'Đổi mật khẩu thành công', [
            { text: 'OK', onPress: handleClose },
        ]);
    };

    return (
        <View style={styles.container}>
            <ChangePasswordModal
                visible={visible}
                onClose={handleClose}
                onSuccess={handleSuccess}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
});
