/**
 * Language Route
 * Renders the Language selection modal as a screen
 */

import { LanguageModal } from '@/features/settings/components/LanguageModal';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

export default function LanguageRoute() {
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

    return (
        <View style={[styles.container, { backgroundColor: 'transparent' }]}>
            <LanguageModal visible={visible} onClose={handleClose} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
