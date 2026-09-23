/**
 * ItineraryShareSheet Component
 * Bottom sheet displaying user's itineraries for sharing in chat
 * Matches Figma design for itinerary selection modal
 */
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, {
    BottomSheetBackdrop,
    BottomSheetScrollView,
    type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import React, { forwardRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { useItineraries } from '@/features/itinerary/hooks/useItineraries';
import type { Itinerary } from '@/features/itinerary/types/itinerary.types';
import {
    calculateItineraryDuration,
    getItineraryCoverImage,
    getItineraryDestinationsCount,
} from '@/features/itinerary/types/itinerary.types';
import { Colors, Spacing } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

// Import i18n config
import '@/lib/i18n';

interface ItineraryShareSheetProps {
  onSelectItinerary: (itinerary: Itinerary) => void;
}

/**
 * Format date to Vietnamese format (e.g., "15 Th12, 2024")
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${day} Th${month}, ${year}`;
}

/**
 * Individual itinerary item component
 */
interface ItineraryItemProps {
  itinerary: Itinerary;
  onShare: () => void;
  colors: (typeof Colors)['light'] | (typeof Colors)['dark'];
}

function ItineraryItem({ itinerary, onShare, colors }: ItineraryItemProps) {
  const { t } = useTranslation();
  const coverImage = getItineraryCoverImage(itinerary);
  const duration = calculateItineraryDuration(itinerary);
  const destinationsCount = getItineraryDestinationsCount(itinerary);

  return (
    <View style={[styles.itemContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Thumbnail */}
      <Image
        source={{ uri: coverImage }}
        style={styles.thumbnail}
        resizeMode="cover"
      />

      {/* Content */}
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, { color: colors.textPrimary }]} numberOfLines={2}>
          {itinerary.title}
        </Text>

        {/* Date */}
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {formatDate(itinerary.startDate)}
          </Text>
        </View>

        {/* Destinations & Duration */}
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {t('itinerary.destinations', { count: destinationsCount })}
          </Text>
          {duration !== null && (
            <>
              <View style={[styles.separator, { backgroundColor: colors.textSecondary }]} />
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {t('itinerary.duration', { hours: duration })}
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Share Button */}
      <Pressable
        style={[styles.shareButton, { borderColor: colors.actionBlue }]}
        onPress={onShare}
        hitSlop={8}
      >
        <Ionicons name="share-social-outline" size={20} color={colors.actionBlue} />
      </Pressable>
    </View>
  );
}

/**
 * Empty state when user has no itineraries
 */
function EmptyItineraries({ colors }: { colors: (typeof Colors)['light'] | (typeof Colors)['dark'] }) {
  const { t } = useTranslation();
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="calendar-outline" size={48} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
        {t('chat.noItineraries')}
      </Text>
      <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
        {t('chat.createItineraryPrompt')}
      </Text>
    </View>
  );
}

/**
 * Itinerary Share Bottom Sheet
 */
export const ItineraryShareSheet = forwardRef<BottomSheet, ItineraryShareSheetProps>(
  function ItineraryShareSheet({ onSelectItinerary }, ref) {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];

    const { itineraries, loading } = useItineraries();

    // Snap points for the bottom sheet
    const snapPoints = useMemo(() => ['50%', '75%'], []);

    // Backdrop component
    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
        />
      ),
      []
    );

    // Handle close button
    const handleClose = useCallback(() => {
      if (ref && 'current' in ref && ref.current) {
        ref.current.close();
      }
    }, [ref]);

    // Handle share button press
    const handleShare = useCallback(
      (itinerary: Itinerary) => {
        onSelectItinerary(itinerary);
        handleClose();
      },
      [onSelectItinerary, handleClose]
    );

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={[styles.sheetBackground, { backgroundColor: colors.card ?? '#ffffff' }]}
        handleIndicatorStyle={[styles.indicator, { backgroundColor: colors.border ?? '#e2e8f0' }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {t('chat.selectItinerary')}
          </Text>
          <Pressable onPress={handleClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </Pressable>
        </View>

        {/* Content */}
        <BottomSheetScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.actionBlue} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                {t('common.loading')}
              </Text>
            </View>
          ) : itineraries.length === 0 ? (
            <EmptyItineraries colors={colors} />
          ) : (
            itineraries.map((itinerary) => (
              <ItineraryItem
                key={itinerary.id}
                itinerary={itinerary}
                onShare={() => handleShare(itinerary)}
                colors={colors}
              />
            ))
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  indicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.xl,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['2xl'],
  },
  loadingText: {
    marginTop: Spacing.sm,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['2xl'],
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: Spacing.md,
  },
  emptyMessage: {
    fontSize: 14,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    marginTop: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
  },
  itemContent: {
    flex: 1,
    marginLeft: Spacing.md,
    marginRight: Spacing.sm,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    marginLeft: 4,
  },
  separator: {
    width: 1,
    height: 12,
    marginHorizontal: 8,
    opacity: 0.4,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
