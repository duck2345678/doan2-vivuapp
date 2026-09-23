/**
 * Help Route
 * Renders the Help modal as a screen
 */

import { HelpModal } from '@/features/settings/components/HelpModal';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

export default function HelpRoute() {
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
            <HelpModal visible={visible} onClose={handleClose} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
