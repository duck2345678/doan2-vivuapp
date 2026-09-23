/**
 * Community feature types
 */

import type { ItineraryShareData } from "@/features/itinerary/types/itinerary.types";
import type { ChannelInvite } from "@/shared/types";
import type { PostType } from "@/shared/types/backend.types";

export type CommunityTab = "posts" | "messages";
export type ContentFilterTab = "posts" | "itineraries" | "channels";

/** Post visibility/privacy level */
export type PostVisibility = "public" | "friends" | "private";

export interface PostLocation {
  id: string | number;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
}

export interface PostAuthor {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

export interface CommunityPost {
  id: string;
  author: PostAuthor;
  content: string;
  imageUrl?: string;
  postType?: PostType;
  locations: PostLocation[];
  likesCount: number;
  commentsCount: number;
  sharesCount?: number;
  isLiked: boolean;
  createdAt: string;
  updatedAt: string;
  /** Post visibility: 'public' or 'private' (only me) */
  visibility?: PostVisibility;
  /** Optional channel invite embedded in post */
  channelInvite?: ChannelInvite;
  /** Optional itinerary share card embedded in post */
  itineraryShare?: ItineraryShareData;
  /** Optional tags for the post (e.g., "Lịch trình", "Cà phê") */
  tags?: string[];
}

export interface OverflowMenuItem {
  id: string;
  label: string;
  icon: string;
  variant?: "default" | "danger";
  onPress: () => void;
}

export interface CommunityPostsResponse {
  data: CommunityPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}
