import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import type { ItineraryShareData, ItineraryShareStop } from '../types/itinerary.types';

interface ItineraryDetailsSheetProps {
    isVisible: boolean;
    itinerary: ItineraryShareData | null;
    onClose: () => void;
    onOpenMap?: () => void;
    onSave?: () => void;
    onAddToCalendar?: () => void;
}

function RoutePreview() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];
    const bgColor = colorScheme === 'dark' ? '#1e3a5f' : '#eff6ff';

    return (
        <View style={[styles.routePreview, { backgroundColor: bgColor }]}>
            <Svg width="280" height="90" viewBox="0 0 280 90">
                <Path
                    d="M30 70 Q70 70 90 50 Q110 30 150 40 Q190 50 210 30 Q230 10 250 30"
                    stroke={colors.actionBlue}
                    strokeWidth="2"
                    fill="none"
                />
                <Circle cx="30" cy="70" r="14" fill={colors.actionBlue} />
                <Circle cx="100" cy="45" r="14" fill={colors.actionBlue} />
                <Circle cx="170" cy="40" r="14" fill={colors.actionBlue} />
                <Circle cx="250" cy="30" r="14" fill={colors.actionBlue} />
            </Svg>
            <View style={styles.routeNumbers}>
                <Text style={[styles.routeNumber, { left: 16, top: 56 }]}>1</Text>
                <Text style={[styles.routeNumber, { left: 86, top: 31 }]}>2</Text>
                <Text style={[styles.routeNumber, { left: 156, top: 26 }]}>3</Text>
                <Text style={[styles.routeNumber, { left: 236, top: 16 }]}>4</Text>
            </View>
        </View>
    );
}

function FullTimelineStop({ stop, isLast }: { stop: ItineraryShareStop; isLast: boolean }) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];

    return (
        <View style={styles.fullStopContainer}>
            <View style={styles.fullTimelineColumn}>
                <View style={[styles.fullDot, { backgroundColor: colors.textSecondary }]} />
                {!isLast && <View style={[styles.fullLine, { backgroundColor: colors.borderLight }]} />}
            </View>
            <View style={styles.fullStopContent}>
                <Text style={[styles.fullStopTime, { color: colors.textSecondary }]}>{stop.time}</Text>
                <Text style={[styles.fullStopName, { color: colors.textPrimary }]}>{stop.name}</Text>
                <Text style={[styles.fullStopAddress, { color: colors.textSecondary }]}>{stop.address}</Text>
                {stop.note && (
                    <Text style={[styles.fullStopNote, { color: colors.textSecondary }]}>{stop.note}</Text>
                )}
            </View>
        </View>
    );
}

export function ItineraryDetailsSheet({
    isVisible,
    itinerary,
    onClose,
    onOpenMap,
    onSave,
    onAddToCalendar,
}: ItineraryDetailsSheetProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];
    const insets = useSafeAreaInsets();
    const bottomSheetRef = useRef<BottomSheet>(null);

    const snapPoints = useMemo(() => ['85%'], []);

    useEffect(() => {
        if (isVisible) {
            bottomSheetRef.current?.expand();
        } else {
            bottomSheetRef.current?.close();
        }
    }, [isVisible]);

    const handleSheetChanges = useCallback((index: number) => {
        if (index === -1) {
            onClose();
        }
    }, [onClose]);

    if (!itinerary) return null;

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={isVisible ? 0 : -1}
            snapPoints={snapPoints}
            onChange={handleSheetChanges}
            enablePanDownToClose
            backgroundStyle={[styles.sheetBackground, { backgroundColor: colors.background }]}
            handleIndicatorStyle={[styles.indicator, { backgroundColor: colors.borderLight }]}
        >
            <View testID="itinerary-details-sheet" style={styles.sheetContent}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.textPrimary }]}>Chi tiết lịch trình</Text>
                    <TouchableOpacity testID="close-sheet" onPress={onClose} hitSlop={8}>
                        <Ionicons name="close" size={24} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <Text style={[styles.subheader, { color: colors.textSecondary }]}>
                    {itinerary.dayLabel} · {itinerary.date} · {itinerary.stopsCount} điểm · {itinerary.timeRange}
                </Text>

                <View style={styles.tags}>
                    {itinerary.tags.map((tag) => (
                        <View key={tag} style={[styles.tag, { backgroundColor: colors.selectedChipBg, borderColor: colors.selectedChipBorder }]}>
                            <Text style={[styles.tagText, { color: colors.actionBlue }]}>{tag}</Text>
                        </View>
                    ))}
                </View>

                <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
                    <RoutePreview />

                    <TouchableOpacity style={styles.mapLink} activeOpacity={0.7}>
                        <Text style={[styles.mapLinkText, { color: colors.actionBlue }]}>
                            Xem lộ trình trên bản đồ
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.fullTimeline}>
                        {itinerary.stops.map((stop, index) => (
                            <FullTimelineStop
                                key={stop.id}
                                stop={stop}
                                isLast={index === itinerary.stops.length - 1}
                            />
                        ))}
                    </View>
                </BottomSheetScrollView>

                <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, Spacing.md), backgroundColor: colors.background }]}>
                    <TouchableOpacity
                        style={[styles.openMapButton, { backgroundColor: colors.actionBlue }]}
                        onPress={onOpenMap}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.openMapText}>Mở bản đồ</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: colors.muted, borderColor: colors.borderLight }]}
                        onPress={onSave}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="bookmark-outline" size={18} color={colors.textPrimary} />
                        <Text style={[styles.saveText, { color: colors.textPrimary }]}>Lưu</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.calendarButton, { backgroundColor: colors.muted, borderColor: colors.borderLight }]}
                        onPress={onAddToCalendar}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="calendar-outline" size={20} color={colors.textPrimary} />
                    </TouchableOpacity>
                </View>
            </View>
        </BottomSheet>
    );
}

const styles = StyleSheet.create({
    sheetBackground: {
        borderTopLeftRadius: BorderRadius['2xl'],
        borderTopRightRadius: BorderRadius['2xl'],
        ...Shadows.xl,
    },
    indicator: {
        width: 36,
        height: 4,
        borderRadius: 2,
        marginTop: Spacing.sm,
    },
    sheetContent: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.screenPadding,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.md,
    },
    title: {
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.bold,
    },
    subheader: {
        fontSize: Typography.sizes.md,
        paddingHorizontal: Spacing.screenPadding,
        marginBottom: Spacing.md,
    },
    tags: {
        flexDirection: 'row',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.screenPadding,
        marginBottom: Spacing.md,
    },
    tag: {
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
    },
    tagText: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.medium,
    },
    scrollContent: {
        paddingHorizontal: Spacing.screenPadding,
        paddingBottom: 120,
    },
    routePreview: {
        height: 140,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
        position: 'relative',
    },
    routeNumbers: {
        position: 'absolute',
        top: 25,
        left: 0,
        right: 0,
        height: 90,
    },
    routeNumber: {
        position: 'absolute',
        color: '#fff',
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.bold,
    },
    mapLink: {
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    mapLinkText: {
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.medium,
    },
    fullTimeline: {
        gap: 4,
    },
    fullStopContainer: {
        flexDirection: 'row',
        minHeight: 80,
    },
    fullTimelineColumn: {
        width: 24,
        alignItems: 'center',
    },
    fullDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginTop: 4,
    },
    fullLine: {
        width: 2,
        flex: 1,
        marginTop: 4,
    },
    fullStopContent: {
        flex: 1,
        paddingLeft: Spacing.md,
        paddingBottom: Spacing.md,
    },
    fullStopTime: {
        fontSize: Typography.sizes.sm,
        marginBottom: 4,
    },
    fullStopName: {
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.semibold,
        marginBottom: 2,
    },
    fullStopAddress: {
        fontSize: Typography.sizes.sm,
    },
    fullStopNote: {
        fontSize: Typography.sizes.sm,
        fontStyle: 'italic',
        marginTop: 4,
    },
    actionBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.screenPadding,
        paddingTop: Spacing.md,
        ...Shadows.lg,
    },
    openMapButton: {
        flex: 1,
        height: 48,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    openMapText: {
        color: '#fff',
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.semibold,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: Spacing.md,
        height: 48,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
    },
    saveText: {
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.medium,
    },
    calendarButton: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
