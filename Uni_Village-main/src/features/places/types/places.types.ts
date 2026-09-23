/**
 * Places Types
 * TypeScript types for Places feature
 */

import type { PlaceStatus, PlaceSuggestionStatus } from '@/shared/types/enums.types';

// ============================================
// Area Types
// ============================================

export interface AreaRequest {
    code: string;
    name: string;
    description?: string;
}

export interface AreaResponse {
    id: number;
    code: string;
    name: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
}

// ============================================
// Place Type Types
// ============================================

export interface PlaceTypeRequest {
    code: string;
    name: string;
    description?: string;
}

export interface PlaceTypeResponse {
    id: number;
    code: string;
    name: string;
    description: string | null;
}

// ============================================
// Location Types
// ============================================

export interface ProvinceResponse {
    id: number;
    name: string;
}

export interface DistrictResponse {
    id: number;
    name: string;
    provinceId: number;
}

export interface WardResponse {
    id: number;
    name: string;
    districtId: number;
}

// ============================================
// Place Types
// ============================================

export interface PlaceRequest {
    name: string;
    typeId: number;
    areaId?: number;
    provinceId?: number;
    districtId?: number;
    wardId?: number;
    addressDetail?: string;
    description?: string;
    latitude?: number;
    longitude?: number;
    status?: PlaceStatus;
    isOfficial?: boolean;
    ownerUserId?: number;
}

export interface PlaceResponse {
    id: number;
    name: string;
    placeType: PlaceTypeResponse | null;
    province: ProvinceResponse | null;
    district: DistrictResponse | null;
    ward: WardResponse | null;
    addressDetail: string | null;
    latitude: number | null;
    longitude: number | null;
    description: string | null;
    status: PlaceStatus;
    isOfficial: boolean;
    ownerUserId: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface PlaceStatusRequest {
    status: PlaceStatus;
}

// ============================================
// Place Search Params
// ============================================

export interface PlaceSearchParams {
    keyword?: string;
    typeId?: number;
    provinceId?: number;
    districtId?: number;
    wardId?: number;
    status?: PlaceStatus;
    lat?: number;
    lng?: number;
    radius?: number;
    page?: number;
    size?: number;
}

export interface NearbyPlacesParams {
    lat: number;
    lng: number;
    radius?: number;
    keyword?: string;
    typeId?: number;
    status?: PlaceStatus;
}

// ============================================
// Place Suggestion Types
// ============================================

export interface PlaceSuggestionRequest {
    placeName: string;
    typeId?: number;
    areaId?: number;
    provinceId?: number;
    districtId?: number;
    wardId?: number;
    addressDetail?: string;
    latitude?: number;
    longitude?: number;
    description?: string;
}

export interface PlaceSuggestionReviewRequest {
    status: PlaceSuggestionStatus;
    rejectionReason?: string;
    createPlace?: boolean;
}

export interface PlaceSuggestionResponse {
    id: number;
    suggestedById: number;
    suggestedByName: string;
    placeName: string;
    placeType: PlaceTypeResponse | null;
    province: ProvinceResponse | null;
    district: DistrictResponse | null;
    ward: WardResponse | null;
    addressDetail: string | null;
    latitude: number | null;
    longitude: number | null;
    description: string | null;
    status: PlaceSuggestionStatus;
    rejectionReason: string | null;
    reviewedById: number | null;
    reviewedAt: string | null;
    createdAt: string;
}

// ============================================
// Personal Pin Types
// ============================================

export interface PersonalPinRequest {
    name: string;
    latitude?: number;
    longitude?: number;
    note?: string;
}

export interface PersonalPinResponse {
    id: number;
    name: string;
    latitude: number | null;
    longitude: number | null;
    note: string | null;
    createdAt: string;
    updatedAt: string;
}
