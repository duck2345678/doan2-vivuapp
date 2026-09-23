import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PostMediaLightboxProps {
    isOpen: boolean;
    mediaUrls: string[];
    initialIndex?: number;
    onClose: () => void;
}

export function PostMediaLightbox({
    isOpen,
    mediaUrls,
    initialIndex = 0,
    onClose,
}: PostMediaLightboxProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];
    const listRef = useRef<FlatList>(null);
    const [activeIndex, setActiveIndex] = useState(initialIndex);

    const data = useMemo(() => mediaUrls.filter(Boolean), [mediaUrls]);

    const handleViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0 && viewableItems[0].index != null) {
            setActiveIndex(viewableItems[0].index);
        }
    }).current;

    const handleClose = useCallback(() => {
        onClose();
    }, [onClose]);

    const getItemLayout = useCallback(
        (_: unknown, index: number) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
        }),
        []
    );

    return (
        <Modal visible={isOpen} transparent animationType="fade" onRequestClose={handleClose}>
            <View style={styles.overlay}>
                <Pressable style={styles.backdrop} onPress={handleClose} />
                <FlatList
                    ref={listRef}
                    data={data}
                    keyExtractor={(item, index) => `${item}-${index}`}
                    horizontal
                    pagingEnabled
                    initialScrollIndex={initialIndex}
                    getItemLayout={getItemLayout}
                    showsHorizontalScrollIndicator={false}
                    onViewableItemsChanged={handleViewableItemsChanged}
                    viewabilityConfig={{ viewAreaCoveragePercentThreshold: 60 }}
                    renderItem={({ item }) => (
                        <View style={styles.mediaItem}>
                            <Image
                                source={{ uri: item }}
                                style={styles.image}
                                contentFit="contain"
                                transition={200}
                            />
                        </View>
                    )}
                />
                <View style={styles.topBar}>
                    <Pressable style={styles.closeButton} onPress={handleClose}>
                        <MaterialIcons name="close" size={24} color={colors.textPrimary} />
                    </Pressable>
                    <Text style={[styles.counter, { color: colors.textPrimary }]}>
                        {data.length > 0 ? `${activeIndex + 1}/${data.length}` : ''}
                    </Text>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    mediaItem: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    topBar: {
        position: 'absolute',
        top: Spacing.lg,
        left: Spacing.md,
        right: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    closeButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    counter: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.medium,
    },
});
