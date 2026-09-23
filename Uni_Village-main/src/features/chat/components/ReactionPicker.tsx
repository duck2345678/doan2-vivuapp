import BottomSheet from '@gorhom/bottom-sheet';
import React, { forwardRef, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Spacing } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

interface ReactionPickerProps {
    onSelectEmoji: (emoji: string) => void;
}

const COMMON_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🙏', '🎉', '🔥'];

export const ReactionPicker = forwardRef<BottomSheet, ReactionPickerProps>(
    ({ onSelectEmoji }, ref) => {
        const colorScheme = useColorScheme();
        const colors = Colors[colorScheme];
        const snapPoints = useMemo(() => ['25%'], []);

        const handleEmojiPress = (emoji: string) => {
            onSelectEmoji(emoji);
            (ref as any)?.current?.close();
        };

        return (
            <BottomSheet
                ref={ref}
                index={-1}
                snapPoints={snapPoints}
                enablePanDownToClose
                backgroundStyle={{ backgroundColor: colors.card }}
                handleIndicatorStyle={{ backgroundColor: colors.border }}
            >
                <View style={styles.container}>
                    <Text style={[styles.title, { color: colors.text }]}>
                        Chọn biểu cảm
                    </Text>
                    <View style={styles.emojiGrid}>
                        {COMMON_EMOJIS.map((emoji) => (
                            <Pressable
                                key={emoji}
                                style={[styles.emojiButton, { backgroundColor: colors.chipBackground }]}
                                onPress={() => handleEmojiPress(emoji)}
                            >
                                <Text style={styles.emoji}>{emoji}</Text>
                            </Pressable>
                        ))}
                    </View>
                </View>
            </BottomSheet>
        );
    }
);

ReactionPicker.displayName = 'ReactionPicker';

const styles = StyleSheet.create({
    container: {
        padding: Spacing.md,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: Spacing.md,
        textAlign: 'center',
    },
    emojiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        justifyContent: 'center',
    },
    emojiButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emoji: {
        fontSize: 32,
    },
});
