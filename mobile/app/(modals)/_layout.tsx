import { Stack } from 'expo-router';

export default function ModalsLayout() {
    return (
        <Stack
            screenOptions={{
                presentation: 'modal',
                headerShown: false,
                gestureEnabled: false, // Disable swipe to dismiss
                animation: 'slide_from_bottom',
            }}
        >
            <Stack.Screen 
                name="create-itinerary" 
                options={{
                    headerShown: false,
                    gestureEnabled: false,
                    presentation: 'fullScreenModal', // Full screen to hide previous screen
                }}
            />
            <Stack.Screen 
                name="select-destinations" 
                options={{
                    headerShown: false,
                    gestureEnabled: false,
                    presentation: 'fullScreenModal', // Full screen to hide previous screen
                }}
            />
            <Stack.Screen 
                name="itinerary-success" 
                options={{
                    headerShown: false,
                    gestureEnabled: false,
                    presentation: 'fullScreenModal',
                }}
            />
            <Stack.Screen 
                name="itinerary-detail" 
                options={{
                    headerShown: false,
                    gestureEnabled: false,
                    presentation: 'fullScreenModal',
                }}
            />
            <Stack.Screen 
                name="active-trip" 
                options={{
                    headerShown: false,
                    gestureEnabled: false,
                    presentation: 'fullScreenModal',
                }}
            />
        </Stack>
    );
}
