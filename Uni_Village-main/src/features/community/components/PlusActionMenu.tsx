/**
 * PlusActionMenu Component
 * Floating action menu triggered by the + FAB button in Messages tab
 * Matches Figma node 204:734 (popup menu design)
 */
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

interface MenuPosition {
  x: number;
  y: number;
}

interface PlusActionMenuProps {
  visible: boolean;
  onClose: () => void;
  anchorPosition: MenuPosition | null;
  onAddFriend: () => void;
  onCreateChannel: () => void;
}

const MENU_WIDTH = 200;
const MENU_HEIGHT = 94;
const SCREEN_PADDING = 16;

/**
 * Anchored floating menu for + button actions
 */
export function PlusActionMenu({
  visible,
  onClose,
  anchorPosition,
  onAddFriend,
  onCreateChannel,
}: PlusActionMenuProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Calculate menu position clamped to screen bounds
  const getMenuPosition = useCallback((): { top: number; left: number } => {
    if (!anchorPosition) {
      return { top: 100, left: 100 };
    }

    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
    
    // Position menu above and to the left of anchor
    let top = anchorPosition.y - MENU_HEIGHT - 8;
    let left = anchorPosition.x - MENU_WIDTH + 40; // Align right edge near anchor

    // Clamp to screen bounds
    if (left < SCREEN_PADDING) {
      left = SCREEN_PADDING;
    }
    if (left + MENU_WIDTH > screenWidth - SCREEN_PADDING) {
      left = screenWidth - MENU_WIDTH - SCREEN_PADDING;
    }
    if (top < SCREEN_PADDING) {
      // If no room above, show below
      top = anchorPosition.y + 50;
    }
    if (top + MENU_HEIGHT > screenHeight - SCREEN_PADDING) {
      top = screenHeight - MENU_HEIGHT - SCREEN_PADDING;
    }

    return { top, left };
  }, [anchorPosition]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, scaleAnim]);

  const handleAddFriend = () => {
    onClose();
    onAddFriend();
  };

  const handleCreateChannel = () => {
    onClose();
    onCreateChannel();
  };

  const menuPosition = getMenuPosition();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Menu */}
        <Animated.View
          style={[
            styles.menuContainer,
            {
              backgroundColor: colors.card,
              top: menuPosition.top,
              left: menuPosition.left,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
            Shadows.lg,
          ]}
        >
          {/* Add Friend */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleAddFriend}
            activeOpacity={0.7}
          >
            <Ionicons
              name="person-add-outline"
              size={20}
              color={colors.textPrimary}
              style={styles.menuIcon}
            />
            <Text style={[styles.menuText, { color: colors.textPrimary }]}>
              Kết bạn
            </Text>
          </TouchableOpacity>

          {/* Separator */}
          <View
            style={[styles.separator, { backgroundColor: colors.borderLight }]}
          />

          {/* Create Channel */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleCreateChannel}
            activeOpacity={0.7}
          >
            <Ionicons
              name="people-outline"
              size={20}
              color={colors.textPrimary}
              style={styles.menuIcon}
            />
            <Text style={[styles.menuText, { color: colors.textPrimary }]}>
              Tạo Channel
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  menuContainer: {
    position: 'absolute',
    width: MENU_WIDTH,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
  },
  menuIcon: {
    marginRight: Spacing.md,
  },
  menuText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  separator: {
    height: 1,
    marginHorizontal: Spacing.md,
  },
});
