import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Spacing } from '@/shared/constants/spacing';
import { BorderRadius, Colors, MapColors, Shadows } from '@/shared/constants/theme';
import { Typography } from '@/shared/constants/typography';
import React, { memo, useState } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Place } from '../types';
import type { TravelMode } from '@/lib/maps/googleMapsService';

interface DirectionsSetupProps {
    destination: Place;
    onStartNavigation: (options: { origin: string; mode: TravelMode }) => void;
    onClose: () => void;
    colorScheme?: 'light' | 'dark';
}

export const DirectionsSetup = memo(function DirectionsSetup({
    destination,
    onStartNavigation,
    onClose,
    colorScheme = 'light',
}: DirectionsSetupProps) {
    const insets = useSafeAreaInsets();
    const colors = Colors[colorScheme];
    const mapColors = MapColors[colorScheme];

    const [origin, setOrigin] = useState('Vị trí của bạn');
    const [mode, setMode] = useState<TravelMode>('driving');

    const handleStart = () => {
        onStartNavigation({ origin, mode });
    };

    const modes: { id: TravelMode; icon: keyof typeof MaterialIcons.glyphMap; label: string }[] = [
        { id: 'driving', icon: 'directions-car', label: 'Ô tô' },
        { id: 'walking', icon: 'directions-walk', label: 'Đi bộ' },
        { id: 'bicycling', icon: 'directions-bike', label: 'Xe đạp' },
        { id: 'transit', icon: 'directions-bus', label: 'Buýt' },
    ];

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Chỉ đường</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Inputs */}
                <View style={[styles.inputsContainer, { backgroundColor: colors.card }]}>
                    {/* Origin */}
                    <View style={styles.inputRow}>
                        <MaterialIcons name="my-location" size={20} color={colors.tint} style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            value={origin}
                            onChangeText={setOrigin}
                            placeholder="Chọn điểm đi"
                            placeholderTextColor={colors.icon}
                        />
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    {/* Destination */}
                    <View style={styles.inputRow}>
                        <MaterialIcons name="location-on" size={20} color="#EF4444" style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            value={destination.name}
                            editable={false}
                        />
                    </View>
                </View>

                {/* Travel Mode */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Phương tiện</Text>
                <View style={styles.modesContainer}>
                    {modes.map((m) => (
                        <TouchableOpacity
                            key={m.id}
                            style={[
                                styles.modeButton,
                                { backgroundColor: mode === m.id ? colors.tint : colors.card },
                            ]}
                            onPress={() => setMode(m.id)}
                            activeOpacity={0.7}
                        >
                            <MaterialIcons
                                name={m.icon}
                                size={24}
                                color={mode === m.id ? '#fff' : colors.icon}
                            />
                            <Text
                                style={[
                                    styles.modeLabel,
                                    { color: mode === m.id ? '#fff' : colors.text },
                                ]}
                            >
                                {m.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Waypoints Placeholder (Mock) */}
                <TouchableOpacity style={[styles.waypointButton, { borderColor: colors.border }]}>
                    <MaterialIcons name="add" size={20} color={colors.tint} />
                    <Text style={[styles.waypointText, { color: colors.tint }]}>Thêm điểm dừng</Text>
                </TouchableOpacity>

            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: insets.bottom + Spacing.md }]}>
                <TouchableOpacity
                    style={[styles.startButton, { backgroundColor: colors.tint }]}
                    onPress={handleStart}
                >
                    <MaterialIcons name="navigation" size={20} color="#fff" />
                    <Text style={styles.startButtonText}>Bắt đầu đi</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.md,
    },
    backButton: {
        padding: Spacing.xs,
        marginRight: Spacing.sm,
    },
    title: {
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.semibold as any,
    },
    content: {
        padding: Spacing.md,
    },
    inputsContainer: {
        borderRadius: BorderRadius.lg,
        padding: Spacing.sm,
        ...Shadows.sm,
        marginBottom: Spacing.lg,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
    },
    inputIcon: {
        marginRight: Spacing.sm,
        width: 24,
        textAlign: 'center',
    },
    input: {
        flex: 1,
        fontSize: Typography.sizes.base,
        padding: 0,
    },
    divider: {
        height: 1,
        marginLeft: 40,
        marginVertical: 4,
    },
    sectionTitle: {
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.semibold as any,
        marginBottom: Spacing.md,
    },
    modesContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.lg,
    },
    modeButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: Spacing.md,
        marginHorizontal: 4,
        borderRadius: BorderRadius.md,
        ...Shadows.sm,
    },
    modeLabel: {
        fontSize: Typography.sizes.xs,
        marginTop: 4,
        fontWeight: Typography.weights.medium as any,
    },
    waypointButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    waypointText: {
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.medium as any,
        marginLeft: Spacing.sm,
    },
    footer: {
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.md,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    startButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        gap: Spacing.sm,
    },
    startButtonText: {
        color: '#fff',
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.semibold as any,
    },
});
