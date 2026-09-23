/**
 * useMyPosts Hook - Fetches current user's posts and saved posts for profile
 */

import type { CommunityPost } from "@/features/community/types";
import { postsApi } from "@/features/post/api";
import { useLikePost as useRealLikePost } from "@/features/post/hooks";
import type { PostResponse } from "@/features/post/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProfileTabKey } from "../components/ProfileTabs";
import type { ProfilePost } from "../types";

export const myPostsKeys = {
  all: ["myPosts"] as const,
  list: (tab: ProfileTabKey) => [...myPostsKeys.all, tab] as const,
};

/**
 * Map PostResponse from backend to ProfilePost format for UI
 */
function mapPostResponseToProfilePost(post: PostResponse): ProfilePost {
  return {
    id: String(post.id ?? ""),
    author: {
      id: String(post.authorId ?? ""),
      name: post.authorName ?? "Unknown",
      avatarUrl: post.authorAvatarUrl,
    },
    content: post.content ?? "",
    imageUrl: post.mediaUrls?.[0], // Use first image as main image
    createdAt: post.createdAt ?? new Date().toISOString(),
    visibility: post.visibility, // PUBLIC, PRIVATE, FRIENDS
    locations:
      post.locations?.map((loc) => ({
        id: String(loc.id ?? ""),
        name: loc.name ?? "",
      })) ?? [],
    reactions: {
      likes: post.reactionCount ?? 0,
      comments: post.commentCount ?? 0,
      shares: 0,
      isLiked: post.isLiked ?? false,
    },
  };
}

/**
 * Convert ProfilePost to CommunityPost format for PostCard compatibility
 */
export function mapProfilePostToCommunityPost(
  post: ProfilePost
): CommunityPost {
  // Map visibility: PUBLIC -> public, PRIVATE -> private
  let visibility: "public" | "private" | "friends" = "public";
  if (post.visibility) {
    const v = post.visibility.toUpperCase();
    if (v === "PRIVATE") visibility = "private";
    else if (v === "FRIENDS") visibility = "friends";
  }

  return {
    id: post.id,
    author: {
      id: post.author.id,
      displayName: post.author.name,
      avatarUrl: post.author.avatarUrl,
    },
    content: post.content,
    imageUrl: post.imageUrl,
    locations: post.locations.map((loc) => ({
      id: loc.id,
      name: loc.name,
    })),
    likesCount: post.reactions.likes,
    commentsCount: post.reactions.comments,
    sharesCount: post.reactions.shares,
    isLiked: post.reactions.isLiked ?? false,
    createdAt: post.createdAt,
    updatedAt: post.createdAt, // Use createdAt as fallback
    visibility,
  };
}

export function useMyPosts(tab: ProfileTabKey = "my-posts") {
  return useQuery<ProfilePost[], Error>({
    queryKey: myPostsKeys.list(tab),
    queryFn: async (): Promise<ProfilePost[]> => {
      try {
        let response;
        if (tab === "favorites") {
          response = await postsApi.getSavedPosts({ page: 0, size: 50 });
        } else {
          response = await postsApi.getMyPosts({ page: 0, size: 50 });
        }

        // Extract content from response and map to ProfilePost format
        const posts = response.result?.content ?? [];
        return posts.map(mapPostResponseToProfilePost);
      } catch (error) {
        console.error("Error fetching my posts:", error);
        return [];
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Wrapper for useLikePost that invalidates myPosts queries immediately
 * This provides faster UI updates compared to waiting for optimistic updates
 */
export function useProfileLikePost() {
  const queryClient = useQueryClient();
  const realLikePost = useRealLikePost();

  return useMutation({
    mutationFn: (postId: string) => realLikePost.mutateAsync(Number(postId)),
    onSuccess: () => {
      // Invalidate immediately for fast UI update from cache
      queryClient.invalidateQueries({ queryKey: myPostsKeys.all });
    },
  });
}
