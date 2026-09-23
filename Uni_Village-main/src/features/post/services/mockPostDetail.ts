/**
 * Mock Post Detail Service
 * Provides mock data for development
 */

import type { Comment, PostDetail, PostDetailResponse } from '../types';

const mockPost: PostDetail = {
  id: 'post-1',
  author: {
    id: 'user-1',
    displayName: 'Nguyễn Minh Anh',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
    isOnline: true,
    isVerified: true,
  },
  content: 'Tuần này check-in đủ 5 quán cà phê mới, nhận được huy hiệu',
  imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&h=600&fit=crop',
  locations: [
    { id: 'loc-1', name: 'The Coffee House', lat: 10.7769, lng: 106.7009 },
    { id: 'loc-2', name: 'Highlands Coffee', lat: 10.7821, lng: 106.6960 },
  ],
  likesCount: 42,
  commentsCount: 8,
  sharesCount: 15,
  isLiked: false,
  visibility: 'public',
  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
};

const mockComments: Comment[] = [
  {
    id: 'comment-1',
    author: {
      id: 'user-2',
      displayName: 'Minh Châu',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
    },
    content: 'Quán này view đẹp lắm! Mình đã đến đây tuần trước, không gian rất thoáng mát và cà phê thơm ngon 👍',
    likesCount: 24,
    isLiked: true,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    replies: [
      {
        id: 'comment-1-reply-1',
        author: {
          id: 'user-1',
          displayName: 'Nguyễn Minh Anh',
          avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop',
        },
        content: 'Cảm ơn bạn đã chia sẻ! Mình sẽ ghé thử vào cuối tuần này 😊',
        likesCount: 5,
        isLiked: false,
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        parentId: 'comment-1',
      },
    ],
  },
  {
    id: 'comment-2',
    author: {
      id: 'user-3',
      displayName: 'Tuấn Anh',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
    },
    content: 'Có ai biết quán này mở cửa mấy giờ không ạ? Mình muốn đi sáng sớm để làm việc',
    likesCount: 8,
    isLiked: false,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    replies: [],
  },
];

// Current user for comment composer
export const mockCurrentUser = {
  id: 'current-user',
  displayName: 'You',
  avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop',
};

/**
 * Simulates fetching post detail from API
 */
export async function fetchPostDetail(postId: string): Promise<PostDetailResponse> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    post: { ...mockPost, id: postId },
    comments: mockComments,
  };
}

/**
 * Simulates creating a comment
 */
export async function createComment(
  postId: string,
  content: string,
  parentId?: string
): Promise<Comment> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const newComment: Comment = {
    id: `comment-${Date.now()}`,
    author: mockCurrentUser,
    content,
    likesCount: 0,
    isLiked: false,
    createdAt: new Date().toISOString(),
    parentId,
    replies: [],
  };

  return newComment;
}

/**
 * Simulates toggling like on a post
 */
export async function togglePostLike(postId: string): Promise<{ isLiked: boolean; likesCount: number }> {
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Return toggled state (in real app, server would return actual state)
  return { isLiked: true, likesCount: 43 };
}

/**
 * Simulates toggling like on a comment
 */
export async function toggleCommentLike(commentId: string): Promise<{ isLiked: boolean; likesCount: number }> {
  await new Promise((resolve) => setTimeout(resolve, 200));

  return { isLiked: true, likesCount: 25 };
}
