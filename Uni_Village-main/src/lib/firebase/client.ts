/**
 * Firebase Client Configuration
 * Initialize and export Firebase client
 */

import { env } from '@/config/env';
import { FirebaseApp, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
    apiKey: env.FIREBASE_API_KEY,
    authDomain: env.FIREBASE_AUTH_DOMAIN,
    projectId: env.FIREBASE_PROJECT_ID,
    storageBucket: env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
    appId: env.FIREBASE_APP_ID,
};

// Initialize Firebase
export const firebaseApp: FirebaseApp = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth: Auth = getAuth(firebaseApp);
export const firestore: Firestore = getFirestore(firebaseApp);

/**
 * Helper to get current user
 */
export const getCurrentUser = () => {
    return auth.currentUser;
};

/**
 * Helper to get current session
 */
export const getCurrentSession = async () => {
    const user = auth.currentUser;
    if (!user) {
        return null;
    }

    try {
        const token = await user.getIdToken();
        return {
            user,
            token,
        };
    } catch (error) {
        console.error('Error getting session:', error);
        return null;
    }
};
