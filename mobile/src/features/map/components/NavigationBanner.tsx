/**
 * NavigationBanner - Turn-by-turn Navigation Header
 *
 * Displays current navigation instruction with:
 * - Direction icon (turn left/right, straight, etc.)
 * - Distance to next turn
 * - Street name in Vietnamese
 *
 * Designed for glanceable reading while driving
 */

import type { RouteStep } from "@/lib/maps/googleMapsService";
import { Spacing } from "@/shared/constants/spacing";
import { BorderRadius, MapColors, Shadows } from "@/shared/constants/theme";
import { Typography } from "@/shared/constants/typography";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LaneGuidance, type Lane } from './LaneGuidance';

export interface NavigationBannerProps {
    /** Current navigation step */
    currentStep: RouteStep | null;
    /** Distance to the next turn (formatted, e.g., "200 m", "1.5 km") */
    distanceToTurn?: string;
    /** Override street name display */
    nextStreetName?: string;
    /** Show ETA information */
    eta?: string;
    /** Total remaining distance */
    remainingDistance?: string;
    /** Lane guidance data */
    lanes?: Lane[];
    /** Current speed limit in km/h */
    speedLimit?: number;
    /** Color scheme */
    colorScheme?: "light" | "dark";
    /** Whether navigation is in progress */
    isNavigating?: boolean;
}

/** Map maneuver types to Material Icons */
function getManeuverIcon(
    maneuver?: string
): keyof typeof MaterialIcons.glyphMap {
    switch (maneuver) {
        case "turn-left":
            return "turn-left";
        case "turn-right":
            return "turn-right";
        case "turn-slight-left":
            return "turn-slight-left";
        case "turn-slight-right":
            return "turn-slight-right";
        case "turn-sharp-left":
            return "turn-sharp-left";
        case "turn-sharp-right":
            return "turn-sharp-right";
        case "uturn-left":
        case "u-turn":
            return "u-turn-left";
        case "uturn-right":
            return "u-turn-right";
        case "roundabout-left":
        case "roundabout-right":
            return "roundabout-right";
        case "merge":
            return "merge";
        case "fork-left":
            return "fork-left";
        case "fork-right":
            return "fork-right";
        case "ramp-left":
            return "ramp-left";
        case "ramp-right":
            return "ramp-right";
        case "straight":
        default:
            return "arrow-upward";
    }
}

/** Convert maneuver to Vietnamese instruction */
function getVietnameseInstruction(
    maneuver?: string,
    streetName?: string
): string {
    const direction = (() => {
        switch (maneuver) {
            case "turn-left":
                return "Rẽ trái";
            case "turn-right":
                return "Rẽ phải";
            case "turn-slight-left":
                return "Rẽ nhẹ trái";
            case "turn-slight-right":
                return "Rẽ nhẹ phải";
            case "turn-sharp-left":
                return "Rẽ gấp trái";
            case "turn-sharp-right":
                return "Rẽ gấp phải";
            case "uturn-left":
            case "uturn-right":
            case "u-turn":
                return "Quay đầu";
            case "roundabout-left":
            case "roundabout-right":
                return "Vào vòng xuyến";
            case "merge":
                return "Nhập làn";
            case "fork-left":
                return "Rẽ nhánh trái";
            case "fork-right":
                return "Rẽ nhánh phải";
            case "ramp-left":
                return "Lên dốc trái";
            case "ramp-right":
                return "Lên dốc phải";
            case "straight":
            default:
                return "Đi thẳng";
        }
    })();

    if (streetName) {
        return `${direction} về hướng ${streetName}`;
    }
    return direction;
}

/** Extract street name from HTML instruction */
function extractStreetName(htmlInstruction?: string): string | undefined {
    if (!htmlInstruction) return undefined;

    // Remove HTML tags
    const text = htmlInstruction.replace(/<[^>]*>/g, "");

    // Try to find street/road name patterns
    const patterns = [
        /(?:onto|toward|to|vào|về hướng)\s+(.+?)(?:\s*$|,)/i,
        /(?:Đường|đường)\s+(.+?)(?:\s*$|,)/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }

    return undefined;
}

export const NavigationBanner = memo(function NavigationBanner({
    currentStep,
    distanceToTurn,
    nextStreetName,
    eta,
    remainingDistance,
    lanes,
    speedLimit,
    colorScheme = "light",
    isNavigating = true,
}: NavigationBannerProps) {
    const insets = useSafeAreaInsets();
    const mapColors = MapColors[colorScheme];

    // Extract information from current step
    const maneuverIcon = useMemo(
        () => getManeuverIcon(currentStep?.maneuver),
        [currentStep?.maneuver]
    );

    const streetName = useMemo(() => {
        if (nextStreetName) return nextStreetName;
        return extractStreetName(currentStep?.instruction);
    }, [nextStreetName, currentStep?.instruction]);

    const instruction = useMemo(
        () => getVietnameseInstruction(currentStep?.maneuver, streetName),
        [currentStep?.maneuver, streetName]
    );

    const distance = distanceToTurn || currentStep?.distance || "";

    if (!isNavigating || !currentStep) {
        return null;
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top + Spacing.xs }]}>
            <LinearGradient
                colors={[mapColors.navigationBannerBg, mapColors.navigationBannerBgGradient]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                {/* Main Navigation Info */}
                <View style={styles.mainContent}>
                    {/* Direction Icon */}
                    <View style={styles.iconContainer}>
                        <MaterialIcons
                            name={maneuverIcon}
                            size={48}
                            color={mapColors.navigationBannerIcon}
                        />
                    </View>

                    {/* Instruction Text */}
                    <View style={styles.textContainer}>
                        {/* Distance to turn - Large, bold */}
                        <Text style={styles.distanceText} numberOfLines={1}>
                            {distance}
                        </Text>

                        {/* Street name / Direction */}
                        <Text style={styles.instructionText} numberOfLines={2}>
                            {instruction}
                        </Text>
                    </View>
                </View>

                {/* Bottom Info Row (ETA & Remaining) */}
                {(eta || remainingDistance) && (
                    <View style={styles.bottomRow}>
                        {remainingDistance && (
                            <View style={styles.infoChip}>
                                <MaterialIcons name="straighten" size={14} color="#fff" />
                                <Text style={styles.infoText}>{remainingDistance}</Text>
                            </View>
                        )}
                        {eta && (
                            <View style={styles.infoChip}>
                                <MaterialIcons name="schedule" size={14} color="#fff" />
                                <Text style={styles.infoText}>{eta}</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Lane Guidance & Speed Limit */}
                {(lanes && lanes.length > 0) || speedLimit ? (
                    <View style={styles.laneGuidanceContainer}>
                        <LaneGuidance lanes={lanes || []} speedLimit={speedLimit} />
                    </View>
                ) : null}
            </LinearGradient>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        ...Shadows.lg,
    },
    gradient: {
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.md,
        borderBottomLeftRadius: BorderRadius.xl,
        borderBottomRightRadius: BorderRadius.xl,
    },
    mainContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: BorderRadius.lg,
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        alignItems: "center",
        justifyContent: "center",
    },
    textContainer: {
        flex: 1,
        gap: Spacing.xs,
    },
    distanceText: {
        fontSize: 32,
        fontWeight: Typography.weights.bold as any,
        color: "#FFFFFF",
        letterSpacing: -0.5,
    },
    instructionText: {
        fontSize: 18,
        fontWeight: Typography.weights.medium as any,
        color: "rgba(255, 255, 255, 0.9)",
        lineHeight: 24,
    },
    bottomRow: {
        flexDirection: "row",
        gap: Spacing.sm,
        marginTop: Spacing.sm,
        paddingTop: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: "rgba(255, 255, 255, 0.2)",
    },
    infoChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.xs,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        borderRadius: BorderRadius.pill,
    },
    infoText: {
        fontSize: 14,
        fontWeight: Typography.weights.medium as any,
        color: "#FFFFFF",
    },
    laneGuidanceContainer: {
        marginTop: Spacing.sm,
        paddingTop: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: "rgba(255, 255, 255, 0.2)",
    },
});
