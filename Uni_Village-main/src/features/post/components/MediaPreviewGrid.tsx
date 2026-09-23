import { MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

import { BorderRadius, Colors, Spacing } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
interface PreviewFile {
    id: string;
    uri: string;
}

interface MediaPreviewGridProps {
    files: PreviewFile[];
    onRemove?: (fileId: string) => void;
}

/**
 * MediaPreviewGrid - Grid hiển thị preview ảnh/video đã chọn
 * Cho phép xoá từng file với nút X
 */
export function MediaPreviewGrid({ files, onRemove }: MediaPreviewGridProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const activeFile = useMemo(
        () => (activeIndex === null ? null : files[activeIndex] ?? null),
        [activeIndex, files]
    );

    const openPreview = useCallback((index: number) => {
        setActiveIndex(index);
    }, []);

    const closePreview = useCallback(() => {
        setActiveIndex(null);
    }, []);

    useEffect(() => {
        if (activeIndex === null) return;
        if (activeIndex < 0 || activeIndex >= files.length) {
            setActiveIndex(null);
        }
    }, [activeIndex, files.length]);

    if (files.length === 0) {
        return null;
    }

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
        >
            {files.map((file, index) => (
                <View key={file.id} style={styles.imageWrapper}>
                    <TouchableOpacity
                        style={styles.imagePressable}
                        activeOpacity={0.9}
                        onPress={() => openPreview(index)}
                    >
                        <Image
                            source={{ uri: file.uri }}
                            style={styles.image}
                            resizeMode="cover"
                        />
                    </TouchableOpacity>
                    {onRemove && (
                        <TouchableOpacity
                            style={[styles.removeButton, { backgroundColor: colors.background }]}
                            onPress={() => onRemove(file.id)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <MaterialIcons name="close" size={16} color={colors.text} />
                        </TouchableOpacity>
                    )}
                </View>
            ))}
            <Modal
                visible={activeIndex !== null}
                transparent
                animationType="fade"
                onRequestClose={closePreview}
            >
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.modalBackdrop} onPress={closePreview} />
                    <View style={styles.modalContent}>
                        <ScrollView
                            style={styles.modalScroll}
                            contentContainerStyle={styles.modalScrollContent}
                            maximumZoomScale={3}
                            minimumZoomScale={1}
                            bouncesZoom
                            centerContent
                        >
                            {activeFile && (
                                <Image
                                    source={{ uri: activeFile.uri }}
                                    style={styles.modalImage}
                                    resizeMode="contain"
                                />
                            )}
                        </ScrollView>
                        <TouchableOpacity
                            style={[styles.modalCloseButton, { backgroundColor: colors.background }]}
                            onPress={closePreview}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <MaterialIcons name="close" size={18} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: Spacing.md,
    },
    contentContainer: {
        gap: Spacing.sm,
        paddingHorizontal: 2,
    },
    imageWrapper: {
        position: 'relative',
    },
    imagePressable: {
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
    },
    image: {
        width: 120,
        height: 120,
        borderRadius: BorderRadius.md,
    },
    removeButton: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContent: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalScroll: {
        width: '100%',
        height: '100%',
    },
    modalScrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    modalImage: {
        width: '100%',
        height: '100%',
    },
    modalCloseButton: {
        position: 'absolute',
        top: Spacing.lg,
        right: Spacing.lg,
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
