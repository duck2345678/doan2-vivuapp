import { MaterialIcons } from '@expo/vector-icons';
import BottomSheet, {
    BottomSheetBackdrop,
    BottomSheetView,
} from '@gorhom/bottom-sheet';
import React, { useCallback, useMemo, useRef } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { PostLocation } from '@/features/post/types';
import { Button } from '@/shared/components/ui';
import { BorderRadius, Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

interface PostLocationDetailSheetProps {
    isOpen: boolean;
    location?: PostLocation | null;
    onClose: () => void;
    onViewDetails?: (location: PostLocation) => void;
    onOpenMap?: (location: PostLocation) => void;
}

export function PostLocationDetailSheet({
    isOpen,
    location,
    onClose,
    onViewDetails,
    onOpenMap,
}: PostLocationDetailSheetProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];
    const bottomSheetRef = useRef<BottomSheet>(null);

    const snapPoints = useMemo(() => [260], []);

    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.4}
            />
        ),
        []
    );

    const handleSheetChanges = useCallback(
        (index: number) => {
            if (index === -1) {
                onClose();
            }
        },
        [onClose]
    );

    const handleOpenMap = useCallback(() => {
        if (!location) return;
        if (onOpenMap) {
            onOpenMap(location);
            return;
        }
        if (location.lat != null && location.lng != null) {
            const url = `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;
            Linking.openURL(url);
        }
    }, [location, onOpenMap]);

    const handleViewDetails = useCallback(() => {
        if (location && onViewDetails) {
            onViewDetails(location);
        }
    }, [location, onViewDetails]);

    React.useEffect(() => {
        if (isOpen) {
            bottomSheetRef.current?.expand();
        } else {
            bottomSheetRef.current?.close();
        }
    }, [isOpen]);

    if (!location) {
        return null;
    }

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={-1}
            snapPoints={snapPoints}
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            onChange={handleSheetChanges}
            backgroundStyle={[
                styles.sheetBackground,
                { backgroundColor: colors.card ?? '#ffffff' },
            ]}
            handleIndicatorStyle={[
                styles.handleIndicator,
                { backgroundColor: colors.border ?? '#e2e8f0' },
            ]}
        >
            <BottomSheetView style={styles.contentContainer}>
                <View style={styles.headerRow}>
                    <MaterialIcons name="location-on" size={20} color={colors.actionBlue} />
                    <Text style={[styles.title, { color: colors.textPrimary }]}>
                        {location.name}
                    </Text>
                    <TouchableOpacity
                        onPress={onClose}
                        style={styles.closeButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <MaterialIcons name="close" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                {!!location.address && (
                    <Text style={[styles.address, { color: colors.textSecondary }]}>
                        {location.address}
                    </Text>
                )}

                {location.lat != null && location.lng != null && (
                    <Text style={[styles.coords, { color: colors.textSecondary }]}>
                        {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                    </Text>
                )}

                <View style={styles.actions}>
                    <Button
                        title="Open map"
                        variant="outline"
                        size="sm"
                        onPress={handleOpenMap}
                        disabled={location.lat == null || location.lng == null}
                        style={styles.actionButton}
                    />
                    {onViewDetails && (
                        <Button
                            title="View details"
                            variant="primary"
                            size="sm"
                            onPress={handleViewDetails}
                            style={styles.actionButton}
                        />
                    )}
                </View>
            </BottomSheetView>
        </BottomSheet>
    );
}

const styles = StyleSheet.create({
    sheetBackground: {
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
    },
    handleIndicator: {
        width: 40,
    },
    contentContainer: {
        paddingHorizontal: Spacing.screenPadding,
        paddingTop: Spacing.sm,
        gap: Spacing.sm,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    title: {
        flex: 1,
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.semibold,
    },
    address: {
        fontSize: Typography.sizes.sm,
        lineHeight: 20,
    },
    coords: {
        fontSize: Typography.sizes.xs,
    },
    actions: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginTop: Spacing.sm,
    },
    actionButton: {
        flex: 1,
    },
    closeButton: {
        padding: Spacing.xs,
    },
});
