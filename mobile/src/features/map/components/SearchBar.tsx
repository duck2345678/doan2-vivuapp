import { Spacing } from '@/shared/constants/spacing';
import { BorderRadius, Colors, MapColors, Shadows } from '@/shared/constants/theme';
import { Typography } from '@/shared/constants/typography';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { memo, useCallback, useEffect, useRef } from 'react';
import {
    Animated,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface SearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    onMicPress?: () => void;
    onClear?: () => void;
    onProfilePress?: () => void;
    placeholder?: string;
    colorScheme?: 'light' | 'dark';
}

export const SearchBar = memo(function SearchBar({
    value,
    onChangeText,
    onFocus,
    onBlur,
    onMicPress,
    onClear,
    onProfilePress,
    placeholder = 'Tìm kiếm ở đây',
    colorScheme = 'light',
}: SearchBarProps) {
    const colors = Colors[colorScheme];
    const mapColors = MapColors[colorScheme];

    // Animation for switching between mic and clear button
    const hasText = value.length > 0;
    const fadeAnim = useRef(new Animated.Value(hasText ? 1 : 0)).current;
    const scaleAnim = useRef(new Animated.Value(hasText ? 1 : 0.8)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: hasText ? 1 : 0,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: hasText ? 1 : 0.8,
                friction: 8,
                tension: 100,
                useNativeDriver: true,
            }),
        ]).start();
    }, [hasText, fadeAnim, scaleAnim]);

    const handleClear = useCallback(() => {
        onChangeText('');
        onClear?.();
    }, [onChangeText, onClear]);

    return (
        <View
            style={[
                styles.container,
                { backgroundColor: mapColors.searchBarBackground },
            ]}
        >
            {/* Location Pin Icon */}
            <View style={styles.locationIconContainer}>
                <MaterialIcons
                    name="location-on"
                    size={22}
                    color={colors.tint}
                />
            </View>

            {/* Search Input */}
            <TextInput
                style={[
                    styles.input,
                    { color: colors.text },
                ]}
                value={value}
                onChangeText={onChangeText}
                onFocus={onFocus}
                onBlur={onBlur}
                placeholder={placeholder}
                placeholderTextColor={colors.icon}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
            />

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
                {/* Clear Button - shows when there's text */}
                {hasText ? (
                    <Animated.View
                        style={{
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }],
                        }}
                    >
                        <TouchableOpacity
                            style={styles.clearButton}
                            onPress={handleClear}
                            activeOpacity={0.7}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityLabel="Xóa tìm kiếm"
                            accessibilityRole="button"
                        >
                            <View style={[styles.clearButtonInner, { backgroundColor: colors.icon }]}>
                                <MaterialIcons
                                    name="close"
                                    size={14}
                                    color={colors.card}
                                />
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                ) : (
                    /* Microphone Button - shows when no text */
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={onMicPress}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Tìm kiếm bằng giọng nói"
                        accessibilityRole="button"
                    >
                        <MaterialIcons
                            name="mic"
                            size={22}
                            color={colors.icon}
                        />
                    </TouchableOpacity>
                )}

                {/* Divider */}
                <View
                    style={[styles.divider, { backgroundColor: colors.border }]}
                />

                {/* Profile Button */}
                <TouchableOpacity
                    style={styles.profileButton}
                    onPress={onProfilePress}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Tài khoản"
                    accessibilityRole="button"
                >
                    <View
                        style={[
                            styles.profileAvatar,
                            { backgroundColor: colors.muted },
                        ]}
                    >
                        <MaterialIcons
                            name="person"
                            size={20}
                            color={colors.icon}
                        />
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 52,
        borderRadius: BorderRadius.pill,
        paddingHorizontal: Spacing.sm,
        ...Shadows.card,
    },
    locationIconContainer: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    input: {
        flex: 1,
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.normal as any,
        paddingVertical: Platform.OS === 'ios' ? Spacing.sm : 0,
        marginRight: Spacing.xs,
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    clearButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    clearButtonInner: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    divider: {
        width: 1,
        height: 24,
        marginHorizontal: Spacing.xs,
    },
    profileButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
