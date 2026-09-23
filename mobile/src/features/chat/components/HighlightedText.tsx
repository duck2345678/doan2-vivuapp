import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Colors } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

interface HighlightedTextProps {
    text: string;
    searchTerm: string;
    style?: any;
}

export function HighlightedText({ text, searchTerm, style }: HighlightedTextProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];

    if (!searchTerm || !text) {
        return <Text style={style}>{text}</Text>;
    }

    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return (
        <Text style={style}>
            {parts.map((part, index) => {
                const isHighlight = regex.test(part);
                return (
                    <Text
                        key={index}
                        style={isHighlight ? [styles.highlight, { backgroundColor: '#FFEB3B' }] : undefined}
                    >
                        {part}
                    </Text>
                );
            })}
        </Text>
    );
}

const styles = StyleSheet.create({
    highlight: {
        fontWeight: '600',
        paddingHorizontal: 2,
    },
});
