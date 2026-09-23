/**
 * Theme Constants
 * Color palette, fonts, and design tokens
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
    light: {
        text: '#11181C',
        textPrimary: '#101828',
        textSecondary: '#6a7282',
        background: '#fff',
        backgroundSecondary: '#f9fafb',
        tint: tintColorLight,
        icon: '#687076',
        tabIconDefault: '#687076',
        tabIconSelected: tintColorLight,
        border: '#e2e8f0',
        borderLight: '#e5e7eb',
        card: '#fff',
        muted: '#f1f5f9',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        errorLight: '#FFEBEE',
        info: '#3b82f6',
        // Edit Profile specific colors
        actionBlue: '#155dfc',
        fabBlue: '#2b7fff',
        fabInner: '#0020d6',
        chipBackground: '#f3f4f6',
        chipBorder: '#d1d5db',
        // Post Detail specific colors
        onlineIndicator: '#00c950',
        heartLiked: '#fb2c36',
        heartUnliked: '#6a7282',
        locationChipGradientStart: '#eff6ff',
        locationChipGradientEnd: '#eef2ff',
        locationChipBorder: '#dbeafe',
        locationChipText: '#1447e6',
        commentBubble: '#f3f4f6',
        commentBubbleReply: '#f9fafb',
        actionButtonText: '#364153',
        statsText: '#4a5565',
        separatorDot: '#99a1af',
        sendButton: '#155dfc',
        sendButtonGradientEnd: '#1447e6',
        // Group Chat specific colors (from Figma)
        pinnedBackground: '#fffbeb',
        pinnedBorder: '#fef3c6',
        pinnedLabel: '#bb4d00',
        selectedChipBg: '#eff6ff',
        selectedChipBorder: '#bedbff',
        checkboxBorder: '#d1d5dc',
        // Auth UI colors (from Figma)
        authInputBorder: '#51A2FF',
        authInputBackground: 'rgba(239, 246, 255, 0.5)',
        authInputPlaceholder: 'rgba(0, 111, 227, 0.7)',
        authPrimaryButton: '#22C55E',
        authPrimaryButtonPressed: '#16A34A',
        authTitleText: '#1E3A8A',
        authLinkText: '#2B7FFF',
        authDividerLine: '#E5E7EB',
        authGradientStart: '#EFF6FF',
        authGradientMid: '#FFFFFF',
        authGradientEnd: '#F0FDF4',
    },
    dark: {
        text: '#ECEDEE',
        textPrimary: '#ECEDEE',
        textSecondary: '#9BA1A6',
        background: '#151718',
        backgroundSecondary: '#1a1d1e',
        tint: tintColorDark,
        icon: '#9BA1A6',
        tabIconDefault: '#9BA1A6',
        tabIconSelected: tintColorDark,
        border: '#2e3336',
        borderLight: '#3a3f42',
        card: '#1e2225',
        muted: '#2e3336',
        success: '#4ade80',
        warning: '#fbbf24',
        error: '#f87171',
        errorLight: '#451a1a',
        info: '#60a5fa',
        // Edit Profile specific colors
        actionBlue: '#3b82f6',
        fabBlue: '#3b82f6',
        fabInner: '#1e40af',
        chipBackground: '#2e3336',
        chipBorder: '#4a5056',
        // Post Detail specific colors
        onlineIndicator: '#4ade80',
        heartLiked: '#f87171',
        heartUnliked: '#9BA1A6',
        locationChipGradientStart: '#1e3a5f',
        locationChipGradientEnd: '#1e2939',
        locationChipBorder: '#2563eb',
        locationChipText: '#60a5fa',
        commentBubble: '#2e3336',
        commentBubbleReply: '#1a1d1e',
        actionButtonText: '#d1d5db',
        statsText: '#9BA1A6',
        separatorDot: '#6b7280',
        sendButton: '#3b82f6',
        sendButtonGradientEnd: '#2563eb',
        // Group Chat specific colors (from Figma - dark mode variants)
        pinnedBackground: '#422006',
        pinnedBorder: '#713f12',
        pinnedLabel: '#fbbf24',
        selectedChipBg: '#1e3a5f',
        selectedChipBorder: '#3b82f6',
        checkboxBorder: '#4a5056',
        // Auth UI colors (dark mode variants)
        authInputBorder: '#3B82F6',
        authInputBackground: 'rgba(30, 58, 95, 0.5)',
        authInputPlaceholder: 'rgba(96, 165, 250, 0.7)',
        authPrimaryButton: '#22C55E',
        authPrimaryButtonPressed: '#16A34A',
        authTitleText: '#E0E7FF',
        authLinkText: '#60A5FA',
        authDividerLine: '#374151',
        authGradientStart: '#1E293B',
        authGradientMid: '#1E1E1E',
        authGradientEnd: '#14532D',
    },
} as const;

export const Fonts = Platform.select({
    ios: {
        sans: 'system-ui',
        serif: 'ui-serif',
        rounded: 'ui-rounded',
        mono: 'ui-monospace',
    },
    default: {
        sans: 'normal',
        serif: 'serif',
        rounded: 'normal',
        mono: 'monospace',
    },
    web: {
        sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        serif: "Georgia, 'Times New Roman', serif",
        rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
        mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    },
})!;

export type ColorScheme = keyof typeof Colors;
export type ColorName = keyof typeof Colors.light;

/**
 * Border Radius tokens
 */
export const BorderRadius = {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 20,
    pill: 24,
    full: 9999,
} as const;

/**
 * Shadow presets for different elevations
 */
export const Shadows = {
    none: {
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
    },
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
    },
    xl: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 12,
    },
    card: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 4,
    },
    chip: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
    },
} as const;

/**
 * Map-specific color tokens
 */
export const MapColors = {
    light: {
        searchBarBackground: '#ffffff',
        chipBackground: '#ffffff',
        chipActiveBackground: '#0a7ea4',
        chipText: '#11181C',
        chipActiveText: '#ffffff',
        controlBackground: '#ffffff',
        suggestionCardBackground: '#ffffff',
        markerDefault: '#ef4444',
        markerSelected: '#0a7ea4',
        userLocationDot: '#3b82f6',
        // Navigation Banner colors
        navigationBannerBg: '#1B5E20',
        navigationBannerBgGradient: '#2E7D32',
        navigationBannerText: '#FFFFFF',
        navigationBannerIcon: '#FFFFFF',
        // Route Polyline colors
        routePolyline: '#4285F4',
        routePolylineStroke: '#FFFFFF',
        routePolylineAlternate: '#9AA0A6',
        // Distance Badge
        distanceBadgeBg: 'rgba(0,0,0,0.7)',
        distanceBadgeText: '#FFFFFF',
        // Bottom Sheet
        bottomSheetHandle: '#D1D5DB',
        bottomSheetBackground: '#FFFFFF',
    },
    dark: {
        searchBarBackground: '#1e2225',
        chipBackground: '#2e3336',
        chipActiveBackground: '#0a7ea4',
        chipText: '#ECEDEE',
        chipActiveText: '#ffffff',
        controlBackground: '#1e2225',
        suggestionCardBackground: '#1e2225',
        markerDefault: '#f87171',
        markerSelected: '#60a5fa',
        userLocationDot: '#60a5fa',
        // Navigation Banner colors
        navigationBannerBg: '#1B3D20',
        navigationBannerBgGradient: '#234D28',
        navigationBannerText: '#FFFFFF',
        navigationBannerIcon: '#FFFFFF',
        // Route Polyline colors
        routePolyline: '#8AB4F8',
        routePolylineStroke: '#1E1E1E',
        routePolylineAlternate: '#5F6368',
        // Distance Badge
        distanceBadgeBg: 'rgba(255,255,255,0.2)',
        distanceBadgeText: '#FFFFFF',
        // Bottom Sheet
        bottomSheetHandle: '#4B5563',
        bottomSheetBackground: '#1e2225',
    },
} as const;
