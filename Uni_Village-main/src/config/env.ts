/**
 * Environment Configuration
 * Centralized access to environment variables
 */

export const env = {
    API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080',

    FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
    FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',

    GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',

    GEMINI_API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',

    // Google OAuth
    GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',

    APP_NAME: process.env.EXPO_PUBLIC_APP_NAME || 'Uni Village',
    APP_VERSION: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',

    ENABLE_ANALYTICS: process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === 'true',
    ENABLE_CRASH_REPORTING: process.env.EXPO_PUBLIC_ENABLE_CRASH_REPORTING === 'true',

    IS_DEV: __DEV__,
} as const;

export function validateEnv(): void {
    if (!env.API_URL) {
        console.warn('API_URL not configured. Using default: http://localhost:8080');
    }

    if (!env.GOOGLE_MAPS_API_KEY) {
        console.warn(
            'GOOGLE_MAPS_API_KEY not configured. Map features may not work. ' +
            'Get your key from: https://console.cloud.google.com/google/maps-apis'
        );
    }

    const firebaseRequired = ['FIREBASE_PROJECT_ID', 'FIREBASE_APP_ID'];
    const missingFirebase = firebaseRequired.filter((key) => !env[key as keyof typeof env]);
    
    if (missingFirebase.length > 0) {
        console.warn(
            `Firebase partially configured. Missing: ${missingFirebase.join(', ')}. ` +
            'File storage and push notifications may not work.'
        );
    }
}

/**
 * Check if Google Maps is properly configured
 */
export function isGoogleMapsConfigured(): boolean {
    return Boolean(env.GOOGLE_MAPS_API_KEY);
}
