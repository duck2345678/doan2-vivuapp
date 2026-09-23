/**
 * Avatar Component
 * User avatar with fallback initials
 */

import { getImageUrl } from "@/shared/utils/imageUtils";
import { Image } from "expo-image";
import { useCallback } from "react";
import {
    ImageStyle,
    Pressable,
    StyleProp,
    StyleSheet,
    Text,
    View,
    ViewStyle,
} from "react-native";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "xxl";

export interface AvatarProps {
  source?: string | null;
  name?: string;
  size?: AvatarSize;
  style?: StyleProp<ViewStyle | ImageStyle>;
  onPress?: () => void;
}

const SIZE_MAP: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
  xxl: 96,
};

const FONT_SIZE_MAP: Record<AvatarSize, number> = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 36,
};

function getInitials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getColorFromName(name?: string): string {
  if (!name) return "#94a3b8";

  const colors = [
    "#f87171",
    "#fb923c",
    "#fbbf24",
    "#a3e635",
    "#4ade80",
    "#34d399",
    "#22d3d8",
    "#38bdf8",
    "#60a5fa",
    "#818cf8",
    "#a78bfa",
    "#c084fc",
    "#e879f9",
    "#f472b6",
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

export function Avatar({
  source,
  name,
  size = "md",
  style,
  onPress,
}: AvatarProps) {
  const dimension = SIZE_MAP[size];
  const fontSize = FONT_SIZE_MAP[size];

  const getPressableStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [pressed && styles.pressed],
    [],
  );

  const absoluteUrl = getImageUrl(source);

  const avatarContent = absoluteUrl ? (
    <Image
      source={{ uri: absoluteUrl }}
      style={[
        styles.image,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
        },
        style as StyleProp<ImageStyle>,
      ]}
      contentFit="cover"
      transition={200}
    />
  ) : (
    <View
      style={[
        styles.fallback,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          backgroundColor: getColorFromName(name),
        },
        style as StyleProp<ViewStyle>,
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{getInitials(name)}</Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`View ${name || "user"}'s profile`}
        style={getPressableStyle}
      >
        {avatarContent}
      </Pressable>
    );
  }

  return avatarContent;
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: "#e2e8f0",
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: "#fff",
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
});
