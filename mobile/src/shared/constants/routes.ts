/**
 * Routes Constants
 * Navigation route names
 */

export const ROUTES = {
    // Tabs
    HOME: '/(tabs)',
    EXPLORE: '/(tabs)/explore',
    MAP: '/(tabs)/map',
    CHAT: '/(tabs)/chat',
    PROFILE: '/(tabs)/profile',

    // Auth
    LOGIN: '/(auth)/login',
    REGISTER: '/(auth)/register',
    FORGOT_PASSWORD: '/(auth)/forgot-password',

    // Modals
    COMMENTS: '/(modals)/comments',
    CREATE_POST: '/(modals)/create-post',

    // Other
    MODAL: '/modal',
} as const;

export type RouteName = (typeof ROUTES)[keyof typeof ROUTES];
