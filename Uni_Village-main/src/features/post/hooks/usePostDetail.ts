/**
 * usePostDetail Hook
 * Fetches post detail with comments using React Query
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    createComment,
    fetchPostDetail,
    toggleCommentLike,
    togglePostLike,
} from '../services/mockPostDetail';
import type { Comment, PostDetailResponse } from '../types';

const POST_DETAIL_KEY = ['post', 'detail'];

/**
 * Hook to fetch post detail with comments
 */
export function usePostDetail(postId: string) {
  return useQuery<PostDetailResponse>({
    queryKey: [...POST_DETAIL_KEY, postId],
    queryFn: () => fetchPostDetail(postId),
    enabled: !!postId,
  });
}

/**
 * Hook to toggle like on a post
 */
export function useTogglePostLike(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => togglePostLike(postId),
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: [...POST_DETAIL_KEY, postId] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<PostDetailResponse>([...POST_DETAIL_KEY, postId]);

      // Optimistically update
      if (previousData) {
        queryClient.setQueryData<PostDetailResponse>([...POST_DETAIL_KEY, postId], {
          ...previousData,
          post: {
            ...previousData.post,
            isLiked: !previousData.post.isLiked,
            likesCount: previousData.post.isLiked
              ? previousData.post.likesCount - 1
              : previousData.post.likesCount + 1,
          },
        });
      }

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData([...POST_DETAIL_KEY, postId], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [...POST_DETAIL_KEY, postId] });
    },
  });
}

/**
 * Hook to create a comment
 */
export function useCreateComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ content, parentId }: { content: string; parentId?: string }) =>
      createComment(postId, content, parentId),
    onSuccess: (newComment: Comment) => {
      // Optimistically add the comment to the list
      const previousData = queryClient.getQueryData<PostDetailResponse>([...POST_DETAIL_KEY, postId]);

      if (previousData) {
        if (newComment.parentId) {
          // Add as a reply
          const updatedComments = previousData.comments.map((comment) => {
            if (comment.id === newComment.parentId) {
              return {
                ...comment,
                replies: [...(comment.replies || []), newComment],
              };
            }
            return comment;
          });

          queryClient.setQueryData<PostDetailResponse>([...POST_DETAIL_KEY, postId], {
            ...previousData,
            comments: updatedComments,
            post: {
              ...previousData.post,
              commentsCount: previousData.post.commentsCount + 1,
            },
          });
        } else {
          // Add as a top-level comment
          queryClient.setQueryData<PostDetailResponse>([...POST_DETAIL_KEY, postId], {
            ...previousData,
            comments: [newComment, ...previousData.comments],
            post: {
              ...previousData.post,
              commentsCount: previousData.post.commentsCount + 1,
            },
          });
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [...POST_DETAIL_KEY, postId] });
    },
  });
}

/**
 * Hook to toggle like on a comment
 */
export function useToggleCommentLike(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => toggleCommentLike(commentId),
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey: [...POST_DETAIL_KEY, postId] });

      const previousData = queryClient.getQueryData<PostDetailResponse>([...POST_DETAIL_KEY, postId]);

      if (previousData) {
        const updateCommentLike = (comments: Comment[]): Comment[] =>
          comments.map((comment) => {
            if (comment.id === commentId) {
              return {
                ...comment,
                isLiked: !comment.isLiked,
                likesCount: comment.isLiked ? comment.likesCount - 1 : comment.likesCount + 1,
              };
            }
            if (comment.replies) {
              return {
                ...comment,
                replies: updateCommentLike(comment.replies),
              };
            }
            return comment;
          });

        queryClient.setQueryData<PostDetailResponse>([...POST_DETAIL_KEY, postId], {
          ...previousData,
          comments: updateCommentLike(previousData.comments),
        });
      }

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData([...POST_DETAIL_KEY, postId], context.previousData);
      }
    },
  });
}
