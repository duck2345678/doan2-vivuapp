import { MOCK_ITINERARY_SHARE } from '@/features/itinerary/mock/itineraryShareMock';
import type { CommunityPost, CommunityPostsResponse } from '../types';

/**
 * CreatePostData interface for creating new posts
 */
export interface CreatePostData {
  content: string;
  visibility?: 'public' | 'followers' | 'private';
  imageUrl?: string;
  locations?: { id: string; name: string }[];
}

/**
 * Mock post data matching Figma design
 */
const INITIAL_MOCK_POSTS: CommunityPost[] = [
  {
    id: 'post-itinerary',
    author: {
      id: 'user-minh-chau',
      displayName: 'Minh Châu',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
    },
    content: 'Coffee tour cuối tuần này. Ai muốn tham gia nhắn mình nhé ☕',
    locations: [],
    likesCount: 24,
    commentsCount: 8,
    sharesCount: 3,
    isLiked: false,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    tags: ['Lịch trình', 'Cà phê'],
    itineraryShare: MOCK_ITINERARY_SHARE,
  },
  {
    id: 'post-channel-invite',
    author: {
      id: 'user-linh-chi',
      displayName: 'Linh Chi',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
    },
    content: 'Channel Cà Phê Homestay đang tìm thêm thành viên! Nơi chia sẻ những quán cafe phong cách ấm cúng, vintage ở làng đại học 🏡☕',
    locations: [],
    likesCount: 42,
    commentsCount: 15,
    sharesCount: 8,
    isLiked: false,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    channelInvite: {
      channelId: 'coffee-homestay',
      name: 'Cà Phê Homestay',
      emoji: '🏡',
      description: 'Khám phá những quán cafe phong cách homestay, ấm cúng',
      memberCount: 856,
    },
  },
  {
    id: '1',
    author: {
      id: 'user-1',
      displayName: 'Nguyễn Minh Anh',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
    },
    content: 'Tuần này check-in đủ 5 quán cà phê mới, nhận được huy hiệu Coffee Lover! Ai cũng đang săn huy hiệu thì cùng mình đi thử nhé 🎉',
    imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&h=400&fit=crop',
    locations: [
      { id: 'loc-1', name: 'The Coffee House' },
      { id: 'loc-2', name: 'Highlands Coffee' },
    ],
    likesCount: 42,
    commentsCount: 8,
    sharesCount: 5,
    isLiked: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    author: {
      id: 'user-2',
      displayName: 'Trần Văn Hùng',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    },
    content: 'Phát hiện quán phở ngon cực kỳ ở khu vực Quận 1! Nước dùng trong, thịt tươi, giá lại rẻ nữa. Ai ở gần ghé thử nhé 🍜',
    imageUrl: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600&h=400&fit=crop',
    locations: [
      { id: 'loc-3', name: 'Phở Hòa Pasteur' },
    ],
    likesCount: 128,
    commentsCount: 23,
    sharesCount: 12,
    isLiked: true,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    author: {
      id: 'user-3',
      displayName: 'Lê Thị Mai',
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
    },
    content: 'Weekend này ai muốn đi hiking ở Núi Bà Đen không? Mình đang lập nhóm, dự kiến xuất phát 5h sáng thứ 7. Comment để join nhé! 🏔️',
    locations: [
      { id: 'loc-4', name: 'Núi Bà Đen' },
    ],
    likesCount: 56,
    commentsCount: 34,
    sharesCount: 7,
    isLiked: false,
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
    updatedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
];

// Mutable store for mock posts (allows adding new posts)
let postsStore: CommunityPost[] = [...INITIAL_MOCK_POSTS];

// Export MOCK_POSTS for backward compatibility
export const MOCK_POSTS = INITIAL_MOCK_POSTS;

/**
 * Simulated API delay
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Mock API service for community posts
 */
export const communityService = {
  getPosts: async (params: { page: number; limit: number }): Promise<CommunityPostsResponse> => {
    await delay(500); // Simulate network delay

    const { page, limit } = params;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = postsStore.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      pagination: {
        page,
        limit,
        total: postsStore.length,
        totalPages: Math.ceil(postsStore.length / limit),
        hasMore: endIndex < postsStore.length,
      },
    };
  },

  createPost: async (data: CreatePostData): Promise<CommunityPost> => {
    await delay(500); // Simulate network delay

    const newPost: CommunityPost = {
      id: `post-${Date.now()}`,
      author: {
        id: 'current-user',
        displayName: 'Bạn',
        avatarUrl: 'https://ui-avatars.com/api/?name=User&background=3B82F6&color=fff',
      },
      content: data.content,
      imageUrl: data.imageUrl,
      locations: data.locations || [],
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      isLiked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add new post to the beginning of the store
    postsStore = [newPost, ...postsStore];

    return newPost;
  },

  likePost: async (postId: string): Promise<{ success: boolean }> => {
    await delay(200);
    return { success: true };
  },

  savePost: async (postId: string): Promise<{ success: boolean }> => {
    await delay(200);
    return { success: true };
  },

  reportPost: async (postId: string, reason: string): Promise<{ success: boolean }> => {
    await delay(200);
    return { success: true };
  },

  blockPost: async (postId: string): Promise<{ success: boolean }> => {
    await delay(200);
    return { success: true };
  },
};

