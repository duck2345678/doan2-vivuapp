import { queryKeys } from "@/config/queryKeys";
import { useAuthStore } from "@/features/auth";
import type { Slice } from "@/shared/types/pagination.types";
import { getNextPageParam } from "@/shared/types/pagination.types";
import type { InfiniteData } from "@tanstack/react-query";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { commentsApi } from "../api";
import type {
  CommentRequest,
  CommentResponse,
  PostSearchParams,
} from "../types";
import {
  isPostCollectionKey,
  updatePostInCollections,
  type PostInfiniteData,
} from "./usePosts";

const STALE_TIME = {
  COMMENTS: 1 * 60 * 1000,
};

export function usePostComments(
  postId: string | number | undefined,
  params: PostSearchParams = {}
) {
  const id = typeof postId === "string" ? parseInt(postId, 10) : postId;
  // Only enable for valid positive IDs to prevent queries for deleted posts
  const isValidId = id != null && !isNaN(id) && id > 0;
  return useInfiniteQuery({
    queryKey: queryKeys.posts.comments(id!, params),
    queryFn: async ({ pageParam = 0 }) => {
      const response = await commentsApi.getPostComments(id!, {
        ...params,
        page: pageParam,
      });
      return response.result;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => getNextPageParam(lastPage),
    enabled: isValidId,
    staleTime: STALE_TIME.COMMENTS,
  });
}

export function useCommentReplies(
  commentId: string | number | undefined,
  params: PostSearchParams = {}
) {
  const id =
    typeof commentId === "string" ? parseInt(commentId, 10) : commentId;
  return useInfiniteQuery({
    queryKey: ["comments", id, "replies", params],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await commentsApi.getCommentReplies(id!, {
        ...params,
        page: pageParam,
      });
      return response.result;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => getNextPageParam(lastPage),
    enabled: !!id && !isNaN(id),
    staleTime: STALE_TIME.COMMENTS,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  type CommentInfiniteData = InfiniteData<Slice<CommentResponse>>;

  return useMutation({
    mutationFn: (data: CommentRequest) => commentsApi.createComment(data),
    onMutate: async (variables) => {
      const postId = variables.postId;
      if (!postId) return { previousComments: [], previousDetail: undefined };

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
      const previousCollections = queryClient.getQueriesData<PostInfiniteData>({
        predicate: (query) => isPostCollectionKey(query.queryKey),
      });
      const previousDetail = queryClient.getQueryData<any>(
        queryKeys.posts.detail(postId)
      );

      const optimisticComment: CommentResponse = {
        id: -Date.now(),
        content: variables.content ?? "",
        authorId: currentUser?.id ? Number(currentUser.id) : undefined,
        authorName: currentUser?.displayName ?? currentUser?.username ?? "You",
        authorAvatarUrl: currentUser?.avatarUrl ?? undefined,
        postId,
        parentCommentId: variables.parentCommentId,
        likeCount: 0,
        isLiked: false,
        timeStamp: new Date().toISOString(),
      };

      if (!variables.parentCommentId) {
        queryClient.setQueriesData<CommentInfiniteData>(
          { predicate },
          (data) => {
            if (!data || data.pages.length === 0) return data;
            const firstPage = data.pages[0];
            const nextContent = [optimisticComment, ...firstPage.content];
            const nextFirstPage = {
              ...firstPage,
              content: nextContent,
              numberOfElements: firstPage.numberOfElements + 1,
              empty: nextContent.length === 0,
            };
            return {
              ...data,
              pages: [nextFirstPage, ...data.pages.slice(1)],
            };
          }
        );
      }

      if (previousDetail) {
        const nextDetail = {
          ...previousDetail,
          commentCount: (previousDetail.commentCount ?? 0) + 1,
        };
        queryClient.setQueryData(queryKeys.posts.detail(postId), nextDetail);
      }

      updatePostInCollections(queryClient, {
        ...(previousDetail ?? ({ id: postId } as any)),
        commentCount: (previousDetail?.commentCount ?? 0) + 1,
      });

      return { previousComments, previousCollections, previousDetail };
    },
    onError: (_error, variables, context) => {
      if (context?.previousComments) {
        context.previousComments.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousCollections) {
        context.previousCollections.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (variables.postId && context?.previousDetail) {
        queryClient.setQueryData(
          queryKeys.posts.detail(variables.postId),
          context.previousDetail
        );
      }
    },
    onSuccess: (response, variables, context) => {
      const postId = variables.postId;
      const createdComment = response.result;

      // Replace optimistic comment with the real one from server
      if (createdComment && postId && !variables.parentCommentId) {
        const predicate = (query: { queryKey: unknown }) => {
          if (!Array.isArray(query.queryKey)) return false;
          return (
            query.queryKey[0] === queryKeys.posts.all[0] &&
            query.queryKey[1] === "comments" &&
            query.queryKey[2] === postId
          );
        };

        queryClient.setQueriesData<CommentInfiniteData>(
          { predicate },
          (data) => {
            if (!data || data.pages.length === 0) return data;
            const firstPage = data.pages[0];
            // Replace the optimistic comment (negative ID) with the real one
            const nextContent = firstPage.content.map((comment) =>
              comment.id < 0 ? createdComment : comment
            );
            return {
              ...data,
              pages: [
                { ...firstPage, content: nextContent },
                ...data.pages.slice(1),
              ],
            };
          }
        );
      }

      // Only invalidate replies query for nested comments since we don't optimistically update those
      if (variables.parentCommentId) {
        queryClient.invalidateQueries({
          queryKey: ["comments", variables.parentCommentId, "replies"],
        });
      }

      // Invalidate profile posts to reflect comment count updates
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && key[0] === "myPosts";
        },
      });
    },
  });
}

export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      commentId,
      data,
    }: {
      commentId: number;
      data: CommentRequest;
    }) => commentsApi.updateComment(commentId, data),
    onSuccess: (_, variables) => {
      if (variables.data.postId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.posts.comments(variables.data.postId, {}),
        });
      }
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      commentId,
      postId,
    }: {
      commentId: number;
      postId: number;
    }) => commentsApi.deleteComment(commentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.posts.comments(variables.postId, {}),
      });
    },
  });
}

export function useReportComment() {
  return useMutation({
    mutationFn: async ({
      commentId,
      reason,
    }: {
      commentId: number;
      reason: string;
    }) => {
      const { reportComment } = await import("@/lib/api");
      const { ApiError } = await import("@/lib/errors/ApiError");
      const { showErrorToast } = await import("@/shared/utils");

      try {
        const response = await reportComment(commentId, reason);
        return response;
      } catch (error) {
        if (error instanceof ApiError) {
          // Handle specific backend errors without showing success message
          if (error.code === "DUPLICATE_REPORT") {
            showErrorToast("Bạn đã báo cáo nội dung này rồi");
          } else if (error.code === "SELF_REPORT") {
            showErrorToast("Bạn không thể báo cáo nội dung của chính mình");
          } else if (error.code === "INVALID_REPORT_TARGET") {
            showErrorToast("Không tìm thấy nội dung cần báo cáo");
          } else {
            showErrorToast("Không thể gửi báo cáo");
          }
        } else {
          showErrorToast("Đã xảy ra lỗi khi gửi báo cáo");
        }
        throw error;
      }
    },
  });
}
