/**
 * useCameraAnimation Hook
 *
 * Automatically adjusts map camera based on vehicle speed:
 * - Low speed (< 20 km/h): High pitch, close zoom for city navigation
 * - Medium speed (20-60 km/h): Medium pitch/zoom for suburban
 * - High speed (> 60 km/h): Low pitch, far zoom for highway
 *
 * This creates a more natural driving experience similar to Google Maps
 */

import { useCallback, useRef, useState } from "react";
import type { Camera } from "react-native-maps";
import type { MapAdapterRef } from "../components/MapAdapter";

export interface CameraConfig {
    /** Camera pitch angle (0-60 degrees) */
    pitch: number;
    /** Zoom level (1-20) */
    zoom: number;
    /** Camera heading/bearing (0-360 degrees) */
    heading: number;
    /** Animation duration in ms */
    animationDuration: number;
}

export interface UseCameraAnimationOptions {
    /** Whether camera animation is enabled */
    enabled?: boolean;
    /** Minimum speed change to trigger animation (km/h) */
    speedThreshold?: number;
    /** Animation duration in milliseconds */
    animationDuration?: number;
    /** Custom speed-to-camera mapping */
    customConfig?: (speed: number) => Partial<CameraConfig>;
}

export interface UseCameraAnimationResult {
    /** Current camera configuration */
    cameraConfig: CameraConfig;
    /** Update camera based on new speed and heading */
    updateCamera: (speed: number, heading: number) => void;
    /** Manually set camera config */
    setCameraConfig: (config: Partial<CameraConfig>) => void;
    /** Apply camera config to map */
    applyCameraToMap: (mapRef: React.RefObject<MapAdapterRef>) => void;
    /** Current speed category */
    speedCategory: "city" | "suburban" | "highway";
}

/** Speed thresholds in km/h */
const SPEED_THRESHOLDS = {
    CITY: 20,
    SUBURBAN: 60,
};

/** Default camera configs for each speed category */
const DEFAULT_CAMERA_CONFIGS: Record<
    "city" | "suburban" | "highway",
    Omit<CameraConfig, "heading" | "animationDuration">
> = {
    city: {
        pitch: 60,
        zoom: 18,
    },
    suburban: {
        pitch: 45,
        zoom: 16,
    },
    highway: {
        pitch: 30,
        zoom: 14,
    },
};

const DEFAULT_OPTIONS: UseCameraAnimationOptions = {
    enabled: true,
    speedThreshold: 5, // 5 km/h change to trigger animation
    animationDuration: 1000,
};

/**
 * Determine speed category based on current speed
 */
function getSpeedCategory(speed: number): "city" | "suburban" | "highway" {
    if (speed < SPEED_THRESHOLDS.CITY) {
        return "city";
    } else if (speed < SPEED_THRESHOLDS.SUBURBAN) {
        return "suburban";
    } else {
        return "highway";
    }
}

/**
 * Calculate camera config based on speed
 * Uses smooth interpolation between speed categories
 */
function calculateCameraConfig(
    speed: number,
    heading: number,
    animationDuration: number,
    customConfig?: (speed: number) => Partial<CameraConfig>
): CameraConfig {
    // Allow custom config override
    if (customConfig) {
        const custom = customConfig(speed);
        return {
            pitch: custom.pitch ?? DEFAULT_CAMERA_CONFIGS.city.pitch,
            zoom: custom.zoom ?? DEFAULT_CAMERA_CONFIGS.city.zoom,
            heading: custom.heading ?? heading,
            animationDuration: custom.animationDuration ?? animationDuration,
        };
    }

    const category = getSpeedCategory(speed);
    const baseConfig = DEFAULT_CAMERA_CONFIGS[category];

    // Interpolate for smoother transitions
    let pitch = baseConfig.pitch;
    let zoom = baseConfig.zoom;

    if (category === "city" && speed > 10) {
        // Smooth transition from city to suburban
        const t = (speed - 10) / (SPEED_THRESHOLDS.CITY - 10);
        pitch = baseConfig.pitch - t * 10; // 60 -> 50
        zoom = baseConfig.zoom - t * 1; // 18 -> 17
    } else if (category === "suburban") {
        // Smooth transition within suburban
        const t =
            (speed - SPEED_THRESHOLDS.CITY) /
            (SPEED_THRESHOLDS.SUBURBAN - SPEED_THRESHOLDS.CITY);
        pitch = baseConfig.pitch - t * 15; // 45 -> 30
        zoom = baseConfig.zoom - t * 2; // 16 -> 14
    }

    return {
        pitch,
        zoom,
        heading,
        animationDuration,
    };
}

/**
 * Hook for automatic camera animation based on vehicle speed
 */
export function useCameraAnimation(
    options: UseCameraAnimationOptions = {}
): UseCameraAnimationResult {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    const [cameraConfig, setCameraConfigState] = useState<CameraConfig>({
        pitch: DEFAULT_CAMERA_CONFIGS.city.pitch,
        zoom: DEFAULT_CAMERA_CONFIGS.city.zoom,
        heading: 0,
        animationDuration: opts.animationDuration!,
    });

    const [speedCategory, setSpeedCategory] = useState<
        "city" | "suburban" | "highway"
    >("city");

    const lastSpeedRef = useRef<number>(0);
    const lastUpdateRef = useRef<number>(0);

    // Update camera based on speed and heading
    const updateCamera = useCallback(
        (speed: number, heading: number) => {
            if (!opts.enabled) return;

            const now = Date.now();
            const speedChange = Math.abs(speed - lastSpeedRef.current);

            // Throttle updates to prevent too frequent animations
            if (
                now - lastUpdateRef.current < 500 &&
                speedChange < opts.speedThreshold!
            ) {
                return;
            }

            const newConfig = calculateCameraConfig(
                speed,
                heading,
                opts.animationDuration!,
                opts.customConfig
            );

            const newCategory = getSpeedCategory(speed);

            setCameraConfigState(newConfig);
            setSpeedCategory(newCategory);

            lastSpeedRef.current = speed;
            lastUpdateRef.current = now;
        },
        [opts.enabled, opts.speedThreshold, opts.animationDuration, opts.customConfig]
    );

    // Manually set camera config
    const setCameraConfig = useCallback((config: Partial<CameraConfig>) => {
        setCameraConfigState((prev) => ({
            ...prev,
            ...config,
        }));
    }, []);

    // Apply current camera config to map
    const applyCameraToMap = useCallback(
        (mapRef: React.RefObject<MapAdapterRef>) => {
            if (!mapRef.current) return;

            const camera: Partial<Camera> = {
                pitch: cameraConfig.pitch,
                heading: cameraConfig.heading,
                zoom: cameraConfig.zoom,
            };

            mapRef.current.animateCamera(camera, cameraConfig.animationDuration);
        },
        [cameraConfig]
    );

    return {
        cameraConfig,
        updateCamera,
        setCameraConfig,
        applyCameraToMap,
        speedCategory,
    };
}

/**
 * Utility: Convert m/s to km/h
 */
export function msToKmh(metersPerSecond: number): number {
    return metersPerSecond * 3.6;
}

/**
 * Utility: Get heading from two coordinates
 */
export function calculateHeading(
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number }
): number {
    const lat1 = (from.latitude * Math.PI) / 180;
    const lat2 = (to.latitude * Math.PI) / 180;
    const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x =
        Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    let heading = (Math.atan2(y, x) * 180) / Math.PI;
    heading = (heading + 360) % 360;

    return heading;
}
