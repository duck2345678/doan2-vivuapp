/**
 * TrafficToggle Component
 *
 * Floating action button to toggle traffic layer visibility on the map
 */

import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

interface TrafficToggleProps {
    /** Whether traffic layer is visible */
    isEnabled: boolean;
    /** Callback when toggle is pressed */
    onToggle: (enabled: boolean) => void;
    /** Optional style override */
    style?: object;
    /** Whether to show label */
    showLabel?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const TrafficToggleComponent: React.FC<TrafficToggleProps> = ({
    isEnabled,
    onToggle,
    style,
    showLabel = false,
}) => {
    const scale = useSharedValue(1);

    const handlePress = useCallback(() => {
        scale.value = withSpring(0.9, { damping: 10 }, () => {
            scale.value = withSpring(1, { damping: 15 });
        });
        onToggle(!isEnabled);
    }, [isEnabled, onToggle, scale]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <AnimatedTouchable
            style={[
                styles.container,
                isEnabled && styles.containerActive,
                animatedStyle,
                style,
            ]}
            onPress={handlePress}
            activeOpacity={0.8}
        >
            <View style={styles.iconContainer}>
                <Ionicons
                    name="speedometer"
                    size={22}
                    color={isEnabled ? '#FFF' : '#374151'}
                />
            </View>
            {showLabel && (
                <Text style={[styles.label, isEnabled && styles.labelActive]}>
                    Traffic
                </Text>
            )}
        </AnimatedTouchable>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        paddingHorizontal: 12,
        paddingVertical: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
        gap: 6,
    },
    containerActive: {
        backgroundColor: '#3B82F6',
    },
    iconContainer: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
    },
    labelActive: {
        color: '#FFFFFF',
    },
});

export const TrafficToggle = memo(TrafficToggleComponent);
