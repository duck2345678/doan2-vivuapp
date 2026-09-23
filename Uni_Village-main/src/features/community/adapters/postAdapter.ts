import type { PostResponse } from "@/features/post/types";
import type { ChannelInvite } from "@/shared/types";
import { getImageUrl } from "@/shared/utils/imageUtils";
import type {
  CommunityPost,
  CommunityPostsResponse,
  PostAuthor,
} from "../types";

/**
 * Parse channel share data from post content
 */
function parseChannelShare(content: string): ChannelInvite | undefined {
  const match = content.match(/\[CHANNEL_SHARE\](.*?)\[\/CHANNEL_SHARE\]/s);
  if (!match) return undefined;

  try {
    const data = JSON.parse(match[1]);
    return {
      channelId: data.channelId,
      name: data.name,
      emoji: data.emoji,
      description: data.description || "",
      memberCount: data.memberCount || 0,
    };
  } catch {
    return undefined;
  }
}

/**
 * Remove channel share marker from content for display
 */
function cleanChannelShareContent(content: string): string {
  return content
    .replace(/\n?\n?\[CHANNEL_SHARE\].*?\[\/CHANNEL_SHARE\]/s, "")
    .trim();
}

export function mapPostResponseToCommunityPost(
  post: PostResponse,
): CommunityPost {
  const author: PostAuthor = {
    id: String(post.authorId),
    displayName: post.authorName || "Unknown",
    avatarUrl: getImageUrl(post.authorAvatarUrl),
  };

  const rawContent = post.content || "";
  const channelInvite = parseChannelShare(rawContent);
  const displayContent = channelInvite
    ? cleanChannelShareContent(rawContent)
    : rawContent;

  return {
    id: String(post.id),
    author,
    content: displayContent,
    imageUrl: getImageUrl(post.mediaUrls?.[0]),
    postType: post.postType,
    locations:
      post.locations?.map((location: any) => ({
        id: String(location.id ?? location.placeId ?? location.name),
        name: location.name ?? "",
        address: location.address ?? undefined,
        lat: location.lat ?? undefined,
        lng: location.lng ?? undefined,
        placeId: location.placeId ?? undefined,
      })) ?? [],
    likesCount: post.reactionCount ?? 0,
    commentsCount: post.commentCount ?? 0,
    sharesCount: 0,
    isLiked: post.isLiked ?? false,
    createdAt: post.createdAt || new Date().toISOString(),
    updatedAt: post.updatedAt || new Date().toISOString(),
    visibility: post.visibility === "PUBLIC" ? "public" : "private",
    channelInvite,
  };
}

export function mapSliceToCommunityPostsResponse(
  slice: any,
  page: number,
  size: number,
): CommunityPostsResponse {
  const posts = (slice.content ?? []).map(mapPostResponseToCommunityPost);

  return {
    data: posts,
    pagination: {
      page: typeof slice.number === "number" ? slice.number + 1 : page,
      limit: size,
      total: 0,
      totalPages: 1,
      hasMore: !slice.last,
    },
  };
}
