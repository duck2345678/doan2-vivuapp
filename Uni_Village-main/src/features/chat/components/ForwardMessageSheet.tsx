import BottomSheet from '@gorhom/bottom-sheet';
import React, { forwardRef, useMemo, useState } from 'react';
import {
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import { usePrivateConversations, useChannelConversations } from '../hooks';
import { Button } from '@/shared/components/ui';

interface ForwardMessageSheetProps {
    messageContent: string;
    onForward: (conversationIds: string[]) => void;
}

export const ForwardMessageSheet = forwardRef<BottomSheet, ForwardMessageSheetProps>(
    ({ messageContent, onForward }, ref) => {
        const colorScheme = useColorScheme();
        const colors = Colors[colorScheme];
        const snapPoints = useMemo(() => ['75%'], []);
        const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

        const { data: privateData } = usePrivateConversations();
        const { data: channelData } = useChannelConversations();

        const allConversations = [
            ...(privateData?.pages.flatMap((p) => p.content) ?? []),
            ...(channelData?.pages.flatMap((p) => p.content) ?? []),
        ];

        const toggleSelection = (id: string) => {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) {
                    next.delete(id);
                } else {
                    next.add(id);
                }
                return next;
            });
        };

        const handleForward = () => {
            onForward(Array.from(selectedIds));
            setSelectedIds(new Set());
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
                        Chuyển tiếp tin nhắn
                    </Text>

                    <View style={[styles.preview, { backgroundColor: colors.chipBackground }]}>
                        <Text style={[styles.previewText, { color: colors.textSecondary }]} numberOfLines={2}>
                            {messageContent}
                        </Text>
                    </View>

                    <FlatList
                        data={allConversations}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => {
                            const isSelected = selectedIds.has(item.id);
                            return (
                                <Pressable
                                    style={[
                                        styles.conversationItem,
                                        { borderBottomColor: colors.border },
                                    ]}
                                    onPress={() => toggleSelection(item.id)}
                                >
                                    <View style={styles.conversationInfo}>
                                        <Text style={[styles.conversationName, { color: colors.text }]}>
                                            {item.name}
                                        </Text>
                                    </View>
                                    <MaterialIcons
                                        name={isSelected ? 'check-circle' : 'radio-button-unchecked'}
                                        size={24}
                                        color={isSelected ? colors.actionBlue : colors.border}
                                    />
                                </Pressable>
                            );
                        }}
                        style={styles.list}
                    />

                    <Button
                        title={`Chuyển tiếp (${selectedIds.size})`}
                        onPress={handleForward}
                        disabled={selectedIds.size === 0}
                        variant="primary"
                    />
                </View>
            </BottomSheet>
        );
    }
);

ForwardMessageSheet.displayName = 'ForwardMessageSheet';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: Spacing.md,
    },
    title: {
        fontSize: Typography.sizes.xl,
        fontWeight: Typography.weights.semibold,
        marginBottom: Spacing.md,
        textAlign: 'center',
    },
    preview: {
        padding: Spacing.md,
        borderRadius: 8,
        marginBottom: Spacing.md,
    },
    previewText: {
        fontSize: Typography.sizes.sm,
    },
    list: {
        flex: 1,
        marginBottom: Spacing.md,
    },
    conversationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
    },
    conversationInfo: {
        flex: 1,
    },
    conversationName: {
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.medium,
    },
});
