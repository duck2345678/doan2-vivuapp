import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Colors, Spacing } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import { useTypingIndicator } from '../hooks/useRealtime';

interface TypingIndicatorProps {
    conversationId: string;
}

export function TypingIndicator({ conversationId }: TypingIndicatorProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];
    const { typingUsers, isAnyoneTyping } = useTypingIndicator(conversationId);
    
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isAnyoneTyping) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [isAnyoneTyping, fadeAnim]);

    if (!isAnyoneTyping) return null;

    const displayText = typingUsers.length === 1
        ? `${typingUsers[0].userName} đang nhắn tin...`
        : typingUsers.length === 2
        ? `${typingUsers[0].userName} và ${typingUsers[1].userName} đang nhắn tin...`
        : `${typingUsers.length} người đang nhắn tin...`;

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <View style={styles.dotsContainer}>
                <Dot delay={0} />
                <Dot delay={150} />
                <Dot delay={300} />
            </View>
            <Text style={[styles.text, { color: colors.textSecondary }]}>
                {displayText}
            </Text>
        </Animated.View>
    );
}

function Dot({ delay }: { delay: number }) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(scaleAnim, {
                    toValue: 1.3,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [delay, scaleAnim]);

    return (
        <Animated.View
            style={[
                styles.dot,
                { backgroundColor: colors.textSecondary, transform: [{ scale: scaleAnim }] },
            ]}
        />
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        gap: Spacing.sm,
    },
    dotsContainer: {
        flexDirection: 'row',
        gap: 4,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    text: {
        fontSize: 14,
        fontStyle: 'italic',
    },
});
