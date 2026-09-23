/**
 * LaneGuidance Component
 *
 * Displays lane guidance arrows during turn-by-turn navigation
 * Shows which lanes are valid for the current maneuver
 */

import { Ionicons } from '@expo/vector-icons';
import React, { memo, useMemo } from 'react';
import {
    StyleSheet,
    Text,
    View,
} from 'react-native';

export interface Lane {
    /** Direction indicators for this lane */
    indications: LaneIndication[];
    /** Whether this lane is valid for the current maneuver */
    isValid: boolean;
}

export type LaneIndication =
    | 'left'
    | 'slight_left'
    | 'slight_right'
    | 'right'
    | 'straight'
    | 'uturn_left'
    | 'uturn_right'
    | 'merge';

interface LaneGuidanceProps {
    /** Array of lane information */
    lanes: Lane[];
    /** Speed limit in km/h (optional) */
    speedLimit?: number;
    /** Whether to show speed limit */
    showSpeedLimit?: boolean;
}

const INDICATION_TO_ICON: Record<LaneIndication, string> = {
    left: 'arrow-back',
    slight_left: 'arrow-up',
    straight: 'arrow-up',
    slight_right: 'arrow-up',
    right: 'arrow-forward',
    uturn_left: 'return-up-back',
    uturn_right: 'return-up-forward',
    merge: 'git-merge',
};

const INDICATION_TO_ROTATION: Record<LaneIndication, number> = {
    left: 0,
    slight_left: -45,
    straight: 0,
    slight_right: 45,
    right: 0,
    uturn_left: 0,
    uturn_right: 0,
    merge: 0,
};

const LaneArrow: React.FC<{ indication: LaneIndication; isValid: boolean }> = memo(
    ({ indication, isValid }) => {
        const iconName = INDICATION_TO_ICON[indication] || 'arrow-up';
        const rotation = INDICATION_TO_ROTATION[indication] || 0;

        return (
            <View
                style={[
                    styles.laneArrow,
                    { transform: [{ rotate: `${rotation}deg` }] },
                ]}
            >
                <Ionicons
                    name={iconName as any}
                    size={20}
                    color={isValid ? '#22C55E' : '#6B7280'}
                />
            </View>
        );
    }
);

const LaneItem: React.FC<{ lane: Lane }> = memo(({ lane }) => {
    const primaryIndication = lane.indications[0] || 'straight';

    return (
        <View style={[styles.lane, lane.isValid && styles.laneValid]}>
            <LaneArrow indication={primaryIndication} isValid={lane.isValid} />
            {lane.indications.length > 1 && (
                <View style={styles.additionalIndicators}>
                    {lane.indications.slice(1).map((ind, idx) => (
                        <LaneArrow key={idx} indication={ind} isValid={lane.isValid} />
                    ))}
                </View>
            )}
        </View>
    );
});

const SpeedLimitBadge: React.FC<{ speed: number }> = memo(({ speed }) => (
    <View style={styles.speedLimit}>
        <Text style={styles.speedLimitText}>{speed}</Text>
        <Text style={styles.speedLimitUnit}>km/h</Text>
    </View>
));

const LaneGuidanceComponent: React.FC<LaneGuidanceProps> = ({
    lanes,
    speedLimit,
    showSpeedLimit = true,
}) => {
    const hasLanes = lanes && lanes.length > 0;
    const hasSpeedLimit = showSpeedLimit && speedLimit && speedLimit > 0;

    const laneElements = useMemo(() => {
        if (!hasLanes) return null;
        return lanes.map((lane, index) => (
            <LaneItem key={index} lane={lane} />
        ));
    }, [lanes, hasLanes]);

    if (!hasLanes && !hasSpeedLimit) {
        return null;
    }

    return (
        <View style={styles.container}>
            {hasLanes && (
                <View style={styles.lanesContainer}>
                    {laneElements}
                </View>
            )}
            {hasSpeedLimit && <SpeedLimitBadge speed={speedLimit} />}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 16,
    },
    lanesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    lane: {
        width: 32,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(107, 114, 128, 0.3)',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(107, 114, 128, 0.5)',
    },
    laneValid: {
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        borderColor: '#22C55E',
    },
    laneArrow: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    additionalIndicators: {
        position: 'absolute',
        bottom: 2,
        flexDirection: 'row',
        gap: 2,
    },
    speedLimit: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFF',
        borderWidth: 3,
        borderColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
    },
    speedLimitText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    speedLimitUnit: {
        fontSize: 8,
        fontWeight: '500',
        color: '#6B7280',
        marginTop: -2,
    },
});

export const LaneGuidance = memo(LaneGuidanceComponent);
