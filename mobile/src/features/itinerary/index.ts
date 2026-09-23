/**
 * Itinerary Feature - Public API
 */

// Screens
export { ActiveTripScreen } from './screens/ActiveTripScreen';
export { AIItineraryWizardScreen } from './screens/AIItineraryWizardScreen';
export { CreateItineraryScreen } from './screens/CreateItineraryScreen';
export { ItineraryDetailScreen } from './screens/ItineraryDetailScreen';
export { ItineraryScreen } from './screens/ItineraryScreen';
export { default as ItinerarySuccessScreen } from './screens/ItinerarySuccessScreen';
export { NavigationScreen } from './screens/NavigationScreen';
export { SelectDestinationsScreen } from './screens/SelectDestinationsScreen';

// Components
export { DestinationMap } from './components/DestinationMap';
export type { DestinationMapRef } from './components/DestinationMap';
export { ItineraryDetailsSheet } from './components/ItineraryDetailsSheet';
export { ItineraryShareCard } from './components/ItineraryShareCard';
export { SelectDestinationsMap } from './components/SelectDestinationsMap';

// API & Services
export * from './api';
export * from './services/itineraryService';

// Types
export * from './types/itinerary.types';

// Hooks
export type { SelectDestinationsMapRef } from './components/SelectDestinationsMap';
export { useItineraries } from './hooks/useItineraries';

// Services
export { fetchItineraries } from './services/itineraryService';

// Mock Data
export { MOCK_ITINERARY_SHARE } from './mock/itineraryShareMock';

