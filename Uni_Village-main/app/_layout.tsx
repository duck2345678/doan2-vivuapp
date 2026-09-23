import { useSettingsStore } from '@/features/settings/store/settings.store';
import i18n from '@/lib/i18n';
import { Providers } from '@/providers';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { LogBox } from 'react-native';
import 'react-native-reanimated';

// Suppress API error popups in dev mode - these are handled by axios interceptors
LogBox.ignoreLogs([
  '[API Error]',
  'ApiError:',
  'Error fetching',
]);

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const language = useSettingsStore((state) => state.language);

  // Sync store language with i18next on startup/change
  useEffect(() => {
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language]);

  return (
    <Providers>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(modals)" options={{ headerShown: false }} />
        <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen
          name="post/create"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="post/[id]"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="chat/[threadId]"
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="chat/new"
          options={{
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="friends/add"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen 
          name="auth/google/callback" 
          options={{ headerShown: false }} 
        />
      </Stack>
      <StatusBar style="auto" />
    </Providers>
  );
}
