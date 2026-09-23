/**
 * useProfilePosts Hook - Fetches user's posts or saved posts
 */

import { useQuery } from "@tanstack/react-query";
import { profileApi } from "../api/profileApi";
import type { ProfilePost, PublicProfileTab } from "../types";

export const profilePostsKeys = {
  all: ["profilePosts"] as const,
  list: (userId: number, tab: PublicProfileTab) =>
    [...profilePostsKeys.all, userId, tab] as const,
  saved: () => [...profilePostsKeys.all, "saved"] as const,
};

// Backend PostResponse structure
interface BackendPostResponse {
  id: number;
  content: string;
  postType?: string;
  visibility?: string;
  authorId: number;
  authorName: string;
  authorAvatarUrl?: string;
  mediaUrls?: string[];
  locations?: Array<{ id: number; name: string }>;
  reactionCount?: number;
  commentCount?: number;
  isLiked?: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Transform backend response to ProfilePost format
function transformToProfilePost(post: BackendPostResponse): ProfilePost {
  return {
    id: String(post.id),
    content: post.content,
    createdAt: post.createdAt,
    visibility: post.visibility,
    imageUrl: post.mediaUrls?.[0],
    author: {
      id: String(post.authorId),
      name: post.authorName,
      avatarUrl: post.authorAvatarUrl,
    },
    locations: (post.locations || []).map((loc) => ({
      id: String(loc.id),
      name: loc.name,
    })),
    reactions: {
      likes: post.reactionCount || 0,
      comments: post.commentCount || 0,
      shares: 0,
      isLiked: post.isLiked || false,
    },
  };
}

export function useProfilePosts(
  userId?: number,
  tab: PublicProfileTab = "posts",
) {
  return useQuery<ProfilePost[], Error>({
    queryKey: userId
      ? profilePostsKeys.list(userId, tab)
      : profilePostsKeys.all,
    queryFn: async (): Promise<ProfilePost[]> => {
      try {
        if (tab === "saved") {
          const response = await profileApi.getSavedPosts();
          // Handle various response formats and transform
          const rawPosts = extractPostsFromResponse(response);
          return rawPosts.map(transformToProfilePost);
        }
        const response = await profileApi.getUserPosts(userId!);
        // Handle various response formats and transform
        const rawPosts = extractPostsFromResponse(response);
        return rawPosts.map(transformToProfilePost);
      } catch (error) {
        console.error("Error fetching profile posts:", error);
        return [];
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

// Helper function to extract posts from various response formats
function extractPostsFromResponse(response: unknown): BackendPostResponse[] {
  // If response is already an array
  if (Array.isArray(response)) {
    return response;
  }

  // If response is an object with content, data, or pagination
  if (response && typeof response === "object") {
    const res = response as Record<string, unknown>;

    // Spring Boot paginated format (Slice)
    if (Array.isArray(res.content)) {
      return res.content as BackendPostResponse[];
    }

    // Frontend PaginatedResponse format
    if (Array.isArray(res.data)) {
      return res.data as BackendPostResponse[];
    }

    // Check for pagination.data
    if (res.pagination && typeof res.pagination === "object") {
      const paginationRes = res.pagination as Record<string, unknown>;
      if (Array.isArray(paginationRes.data)) {
        return paginationRes.data as BackendPostResponse[];
      }
    }
  }

  // Fallback to empty array
  return [];
}
