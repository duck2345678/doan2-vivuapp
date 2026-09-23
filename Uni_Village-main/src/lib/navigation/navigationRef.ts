/**
 * Navigation Utilities
 * Navigation ref for use outside React components
 */

import type { ParamListBase } from '@react-navigation/native';
import { createNavigationContainerRef, StackActions } from '@react-navigation/native';

// Navigation ref for programmatic navigation outside components
export const navigationRef = createNavigationContainerRef<ParamListBase>();

/**
 * Navigate to a screen from outside React components
 */
export function navigate(name: string, params?: Record<string, unknown>): void {
    if (navigationRef.isReady()) {
        navigationRef.navigate(
            name as keyof ParamListBase,
            params as ParamListBase[keyof ParamListBase]
        );
    }
}

/**
 * Go back from outside React components
 */
export function goBack(): void {
    if (navigationRef.isReady() && navigationRef.canGoBack()) {
        navigationRef.goBack();
    }
}

/**
 * Reset navigation stack
 */
export function reset(routes: { name: string; params?: Record<string, unknown> }[]): void {
    if (navigationRef.isReady()) {
        navigationRef.reset({
            index: routes.length - 1,
            routes: routes as never,
        });
    }
}

/**
 * Push a new screen onto the stack
 */
export function push(name: string, params?: Record<string, unknown>): void {
    if (navigationRef.isReady()) {
        navigationRef.dispatch(StackActions.push(name, params));
    }
}

/**
 * Replace current screen
 */
export function replace(name: string, params?: Record<string, unknown>): void {
    if (navigationRef.isReady()) {
        navigationRef.dispatch(StackActions.replace(name, params));
    }
}
