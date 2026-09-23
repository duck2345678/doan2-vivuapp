import { queryKeys } from "@/config/queryKeys";
import type { Slice } from "@/shared/types/pagination.types";
import {
  InfiniteData,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { reactionsApi } from "../api";
import type { CommentResponse, PostResponse } from "../types";
import {
  findPostInCollections,
  isPostCollectionKey,
  updatePostInCollections,
  type PostInfiniteData,
} from "./usePosts";

export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: number) => reactionsApi.likePost(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({
        predicate: (query) => isPostCollectionKey(query.queryKey),
      });
      await queryClient.cancelQueries({
        queryKey: queryKeys.posts.detail(postId),
      });

      const previousCollections = queryClient.getQueriesData<PostInfiniteData>({
        predicate: (query) => isPostCollectionKey(query.queryKey),
      });
      const previousDetail = queryClient.getQueryData<PostResponse>(
        queryKeys.posts.detail(postId)
      );

      const cachedPost =
        previousDetail ?? findPostInCollections(queryClient, postId);
      if (cachedPost) {
        const isLiked = cachedPost.isLiked ?? false;
        const reactionCount = cachedPost.reactionCount ?? 0;
        const nextPost: PostResponse = {
          ...cachedPost,
          isLiked: !isLiked,
          reactionCount: Math.max(0, reactionCount + (isLiked ? -1 : 1)),
        };
        updatePostInCollections(queryClient, nextPost);
        if (previousDetail) {
          queryClient.setQueryData(queryKeys.posts.detail(postId), nextPost);
        }
      }

      return { previousCollections, previousDetail };
    },
    onError: (_error, postId, context) => {
      if (context?.previousCollections) {
        context.previousCollections.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(
          queryKeys.posts.detail(postId),
          context.previousDetail
        );
      }
    },
    onSuccess: (response, postId) => {
      const likeCount = response.result?.likeCount;
      const isLiked = response.result?.isLiked;
      if (likeCount != null || isLiked != null) {
        const cachedPost =
          queryClient.getQueryData<PostResponse>(
            queryKeys.posts.detail(postId)
          ) ?? findPostInCollections(queryClient, postId);
        if (cachedPost) {
          const nextPost: PostResponse = {
            ...cachedPost,
            reactionCount: likeCount ?? cachedPost.reactionCount,
            isLiked: isLiked ?? cachedPost.isLiked,
          };
          updatePostInCollections(queryClient, nextPost);
          queryClient.setQueryData(queryKeys.posts.detail(postId), nextPost);
        }
      }
      // Invalidate profile posts to reflect like updates
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && key[0] === "myPosts";
        },
      });
    },
  });
}

export function useLikeComment() {
  const queryClient = useQueryClient();
  type CommentInfiniteData = InfiniteData<Slice<CommentResponse>>;

  const updateCommentLike = (comment: CommentResponse) => {
    const isLiked = comment.isLiked ?? false;
    const likeCount = comment.likeCount ?? 0;
    return {
      ...comment,
      isLiked: !isLiked,
      likeCount: Math.max(0, likeCount + (isLiked ? -1 : 1)),
    };
  };

  return useMutation({
    mutationFn: ({
      commentId,
      postId,
    }: {
      commentId: number;
      postId: number;
    }) => reactionsApi.likeComment(commentId),
    onMutate: async ({ commentId, postId }) => {
      const predicate = (query: { queryKey: unknown }) => {
        if (!Array.isArray(query.queryKey)) return false;
        return (
          query.queryKey[0] === queryKeys.posts.all[0] &&
          query.queryKey[1] === "comments" &&
          query.queryKey[2] === postId
        );
      };

      await queryClient.cancelQueries({ predicate });

      const previousComments = queryClient.getQueriesData<CommentInfiniteData>({
        predicate,
      });

      queryClient.setQueriesData<CommentInfiniteData>({ predicate }, (data) => {
        if (!data) return data;
        const pages = data.pages.map((page) => ({
          ...page,
          content: page.content.map((comment) =>
            comment.id === commentId ? updateCommentLike(comment) : comment
          ),
        }));
        return { ...data, pages };
      });

      return { previousComments };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousComments) {
        context.previousComments.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: (response, variables) => {
      const likeCount = response.result?.likeCount;
      const isLiked = response.result?.isLiked;
      if (likeCount != null || isLiked != null) {
        const predicate = (query: { queryKey: unknown }) => {
          if (!Array.isArray(query.queryKey)) return false;
          return (
            query.queryKey[0] === queryKeys.posts.all[0] &&
            query.queryKey[1] === "comments" &&
            query.queryKey[2] === variables.postId
          );
        };
        queryClient.setQueriesData<CommentInfiniteData>(
          { predicate },
          (data) => {
            if (!data) return data;
            const pages = data.pages.map((page) => ({
              ...page,
              content: page.content.map((comment) =>
                comment.id === variables.commentId
                  ? {
                      ...comment,
                      likeCount: likeCount ?? comment.likeCount,
                      isLiked: isLiked ?? comment.isLiked,
                    }
                  : comment
              ),
            }));
            return { ...data, pages };
          }
        );
      }
    },
  });
}
