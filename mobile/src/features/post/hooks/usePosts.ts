import { queryKeys } from "@/config/queryKeys";
import { useAuthStore } from "@/features/auth";
import { getNextPageParam, type Slice } from "@/shared/types/pagination.types";
import {
  InfiniteData,
  QueryKey,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { postsApi } from "../api";
import type {
  CreatePostFormData,
  PostResponse,
  PostSearchParams,
  SharePostRequest,
  UpdatePostFormData,
} from "../types";

const STALE_TIME = {
  POSTS: 2 * 60 * 1000,
};

export type PostSlice = Slice<PostResponse>;
export type PostInfiniteData = InfiniteData<PostSlice>;

const POST_COLLECTION_SCOPES = new Set(["feed", "my", "saved"]);

export const isPostCollectionKey = (queryKey: QueryKey) => {
  if (!Array.isArray(queryKey)) return false;
  const [root, scope] = queryKey;
  return (
    root === queryKeys.posts.all[0] && POST_COLLECTION_SCOPES.has(String(scope))
  );
};

export const isSavedPostsKey = (queryKey: QueryKey) => {
  if (!Array.isArray(queryKey)) return false;
  const [root, scope] = queryKey;
  return root === queryKeys.posts.all[0] && scope === "saved";
};

export const updatePostInInfiniteData = (
  data: PostInfiniteData | undefined,
  updatedPost: PostResponse
) => {
  if (!data || updatedPost.id == null) return data;
  let changed = false;
  const pages = data.pages.map((page) => {
    const hasPost = page.content.some((post) => post.id === updatedPost.id);
    if (!hasPost) return page;

    changed = true;
    const content = page.content.map((post) => {
      if (post.id !== updatedPost.id) return post;
      return { ...post, ...updatedPost };
    });
    return { ...page, content };
  });
  return changed ? { ...data, pages } : data;
};

export const removePostFromInfiniteData = (
  data: PostInfiniteData | undefined,
  postId: number
) => {
  if (!data) return data;
  let changed = false;
  const pages = data.pages.map((page) => {
    const hasPost = page.content.some((post) => post.id === postId);
    if (!hasPost) return page;

    changed = true;
    const nextContent = page.content.filter((post) => post.id !== postId);
    const removedCount = page.content.length - nextContent.length;
    return {
      ...page,
      content: nextContent,
      numberOfElements: Math.max(0, page.numberOfElements - removedCount),
      empty: nextContent.length === 0,
    };
  });
  return changed ? { ...data, pages } : data;
};

export const findPostInInfiniteData = (
  data: PostInfiniteData | undefined,
  postId: number
) => {
  if (!data) return undefined;
  for (const page of data.pages) {
    const match = page.content.find((post) => post.id === postId);
    if (match) return match;
  }
  return undefined;
};

export const addPostToInfiniteData = (
  data: PostInfiniteData | undefined,
  newPost: PostResponse
) => {
  if (!data || data.pages.length === 0 || newPost.id == null) return data;
  const firstPage = data.pages[0];
  const nextContent = [newPost, ...firstPage.content];
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
};

export const replacePostInInfiniteData = (
  data: PostInfiniteData | undefined,
  targetId: number,
  nextPost: PostResponse
) => {
  if (!data) return data;
  let changed = false;
  const pages = data.pages.map((page) => {
    const index = page.content.findIndex((post) => post.id === targetId);
    if (index === -1) return page;
    changed = true;
    const content = [...page.content];
    content[index] = nextPost;
    return { ...page, content };
  });
  return changed ? { ...data, pages } : data;
};

const addPostToSavedInfiniteData = (
  data: PostInfiniteData | undefined,
  post: PostResponse
) => {
  if (!data || post.id == null || data.pages.length === 0) return data;
  const firstPage = data.pages[0];
  if (firstPage.content.some((item) => item.id === post.id)) {
    return data;
  }
  const nextFirstPage = {
    ...firstPage,
    content: [post, ...firstPage.content],
    numberOfElements: firstPage.numberOfElements + 1,
    empty: false,
  };
  return {
    ...data,
    pages: [nextFirstPage, ...data.pages.slice(1)],
  };
};

export const updatePostInCollections = (
  queryClient: ReturnType<typeof useQueryClient>,
  post: PostResponse
) => {
  POST_COLLECTION_SCOPES.forEach((scope) => {
    queryClient.setQueriesData<PostInfiniteData>(
      { queryKey: [...queryKeys.posts.all, scope] },
      (data) => updatePostInInfiniteData(data, post)
    );
  });
};

export const addPostToCollections = (
  queryClient: ReturnType<typeof useQueryClient>,
  post: PostResponse
) => {
  queryClient.setQueriesData<PostInfiniteData>(
    {
      predicate: (query) =>
        isPostCollectionKey(query.queryKey) && query.queryKey[1] !== "saved",
    },
    (data) => addPostToInfiniteData(data, post)
  );
};

export const replacePostInCollections = (
  queryClient: ReturnType<typeof useQueryClient>,
  targetId: number,
  post: PostResponse
) => {
  queryClient.setQueriesData<PostInfiniteData>(
    { predicate: (query) => isPostCollectionKey(query.queryKey) },
    (data) => replacePostInInfiniteData(data, targetId, post)
  );
};

export const removePostFromCollections = (
  queryClient: ReturnType<typeof useQueryClient>,
  postId: number
) => {
  queryClient.setQueriesData<PostInfiniteData>(
    { predicate: (query) => isPostCollectionKey(query.queryKey) },
    (data) => removePostFromInfiniteData(data, postId)
  );
};

export const addPostToSavedCollections = (
  queryClient: ReturnType<typeof useQueryClient>,
  post: PostResponse
) => {
  queryClient.setQueriesData<PostInfiniteData>(
    { predicate: (query) => isSavedPostsKey(query.queryKey) },
    (data) => addPostToSavedInfiniteData(data, post)
  );
};

export const removePostFromSavedCollections = (
  queryClient: ReturnType<typeof useQueryClient>,
  postId: number
) => {
  queryClient.setQueriesData<PostInfiniteData>(
    { predicate: (query) => isSavedPostsKey(query.queryKey) },
    (data) => removePostFromInfiniteData(data, postId)
  );
};

export const findPostInCollections = (
  queryClient: ReturnType<typeof useQueryClient>,
  postId: number
) => {
  const collections = queryClient.getQueriesData<PostInfiniteData>({
    predicate: (query) => isPostCollectionKey(query.queryKey),
  });
  for (const [, data] of collections) {
    const match = findPostInInfiniteData(data, postId);
    if (match) return match;
  }
  return undefined;
};

export const isPostSavedInCollections = (
  collections: Array<[QueryKey, PostInfiniteData | undefined]>,
  postId: number
) =>
  collections.some(([, data]) =>
    data?.pages.some((page) => page.content.some((post) => post.id === postId))
  );

export function useFeed(params: PostSearchParams = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.posts.feed(params),
    queryFn: async ({ pageParam = 0 }) => {
      const response = await postsApi.getFeed({ ...params, page: pageParam });
      return response.result;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => getNextPageParam(lastPage),
    staleTime: STALE_TIME.POSTS,
  });
}

export function useMyPosts(params: PostSearchParams = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.posts.my(params),
    queryFn: async ({ pageParam = 0 }) => {
      const response = await postsApi.getMyPosts({
        ...params,
        page: pageParam,
      });
      return response.result;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => getNextPageParam(lastPage),
    staleTime: STALE_TIME.POSTS,
  });
}

export function useSavedPosts(params: PostSearchParams = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.posts.saved(params),
    queryFn: async ({ pageParam = 0 }) => {
      const response = await postsApi.getSavedPosts({
        ...params,
        page: pageParam,
      });
      return response.result;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => getNextPageParam(lastPage),
    staleTime: STALE_TIME.POSTS,
  });
}

export function usePostDetail(postId: string | number | undefined) {
  const id = typeof postId === "string" ? parseInt(postId, 10) : postId;
  return useQuery({
    queryKey: queryKeys.posts.detail(id!),
    queryFn: async () => {
      const response = await postsApi.getPost(id!);
      return response.result;
    },
    enabled: !!id && !isNaN(id),
    staleTime: STALE_TIME.POSTS,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: (data: CreatePostFormData) => postsApi.createPost(data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({
        predicate: (query) => isPostCollectionKey(query.queryKey),
      });

      const previousCollections = queryClient.getQueriesData<PostInfiniteData>({
        predicate: (query) => isPostCollectionKey(query.queryKey),
      });

      const tempId = -Date.now();
      const now = new Date().toISOString();
      const optimisticPost: PostResponse = {
        id: tempId,
        content: data.content ?? "",
        postType: data.postType,
        visibility: data.visibility,
        authorId: currentUser?.id ? Number(currentUser.id) : undefined,
        authorName: currentUser?.displayName ?? currentUser?.username ?? "You",
        authorAvatarUrl: currentUser?.avatarUrl ?? undefined,
        mediaUrls: data.files?.map((file) => file.uri) ?? [],
        createdAt: now,
        updatedAt: now,
        reactionCount: 0,
        commentCount: 0,
        isLiked: false,
        locations: data.locations ?? [],
      };

      addPostToCollections(queryClient, optimisticPost);

      return { previousCollections, tempId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousCollections) {
        context.previousCollections.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: (response, _variables, context) => {
      const createdPost = response.result;
      if (createdPost && context?.tempId != null) {
        replacePostInCollections(queryClient, context.tempId, createdPost);
      }
    },
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      postId,
      data,
    }: {
      postId: number;
      data: UpdatePostFormData;
    }) => postsApi.updatePost(postId, data),
    onMutate: async ({ postId, data }) => {
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
      const optimisticPatch: Partial<PostResponse> = {
        postType: data.postType,
        visibility: data.visibility,
      };
      if (data.content !== undefined) {
        optimisticPatch.content = data.content;
      }
      if (data.locations !== undefined) {
        optimisticPatch.locations = data.locations;
      }

      const optimisticPost = {
        ...(cachedPost ?? ({ id: postId } as PostResponse)),
        ...optimisticPatch,
      };

      updatePostInCollections(queryClient, optimisticPost);
      if (previousDetail) {
        queryClient.setQueryData(
          queryKeys.posts.detail(postId),
          optimisticPost
        );
      }

      return { previousCollections, previousDetail };
    },
    onError: (_error, variables, context) => {
      if (context?.previousCollections) {
        context.previousCollections.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(
          queryKeys.posts.detail(variables.postId),
          context.previousDetail
        );
      }
    },
    onSuccess: (response, variables) => {
      const updatedPost = response.result;
      if (updatedPost) {
        updatePostInCollections(queryClient, updatedPost);
        queryClient.setQueryData(
          queryKeys.posts.detail(variables.postId),
          updatedPost
        );
        // Invalidate profile posts to reflect updates in ProfileScreen
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey;
            return Array.isArray(key) && key[0] === "myPosts";
          },
        });
      }
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  // Helper to check if a query key is for comments of a specific post
  // Uses robust matching to handle all possible query key patterns
  const isCommentsQueryForPost = (queryKey: QueryKey, postId: number) => {
    if (!Array.isArray(queryKey) || queryKey.length < 2) return false;

    // Check if 'comments' appears anywhere in the query key
    const hasComments = queryKey.some((segment) => segment === "comments");
    if (!hasComments) return false;

    // Check if the postId appears in the query key (as number or matching string)
    const hasPostId = queryKey.some(
      (segment) =>
        segment === postId ||
        segment === String(postId) ||
        (typeof segment === "number" && segment === postId)
    );

    return hasPostId;
  };

  return useMutation({
    mutationFn: (postId: number) => postsApi.deletePost(postId),
    onMutate: async (postId) => {
      // Cancel all related queries immediately
      await queryClient.cancelQueries({
        predicate: (query) => isPostCollectionKey(query.queryKey),
      });
      await queryClient.cancelQueries({
        queryKey: queryKeys.posts.detail(postId),
      });
      // Cancel comments queries for this specific post
      await queryClient.cancelQueries({
        predicate: (query) => isCommentsQueryForPost(query.queryKey, postId),
      });

      const previousCollections = queryClient.getQueriesData<PostInfiniteData>({
        predicate: (query) => isPostCollectionKey(query.queryKey),
      });
      const previousDetail = queryClient.getQueryData<PostResponse>(
        queryKeys.posts.detail(postId)
      );

      removePostFromCollections(queryClient, postId);
      queryClient.removeQueries({ queryKey: queryKeys.posts.detail(postId) });
      // Remove comments queries for this post to prevent refetch
      queryClient.removeQueries({
        predicate: (query) => isCommentsQueryForPost(query.queryKey, postId),
      });

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
    onSuccess: (_data, postId) => {
      // Cancel any remaining in-flight comments queries
      queryClient.cancelQueries({
        predicate: (query) => isCommentsQueryForPost(query.queryKey, postId),
      });
      // Remove comments queries to prevent any refetch
      queryClient.removeQueries({
        predicate: (query) => isCommentsQueryForPost(query.queryKey, postId),
      });
    },
  });
}

export function useSavePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: number) => postsApi.savePost(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({
        predicate: (query) => isSavedPostsKey(query.queryKey),
      });
      const previousSaved = queryClient.getQueriesData<PostInfiniteData>({
        predicate: (query) => isSavedPostsKey(query.queryKey),
      });
      const wasSaved = isPostSavedInCollections(previousSaved, postId);

      if (wasSaved) {
        removePostFromSavedCollections(queryClient, postId);
      } else {
        const cachedPost =
          queryClient.getQueryData<PostResponse>(
            queryKeys.posts.detail(postId)
          ) ?? findPostInCollections(queryClient, postId);
        if (cachedPost) {
          addPostToSavedCollections(queryClient, cachedPost);
        }
      }

      return { previousSaved };
    },
    onError: (_error, _postId, context) => {
      if (context?.previousSaved) {
        context.previousSaved.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: (response, postId) => {
      const isSaved = response.result?.isSaved;
      if (isSaved === true) {
        const cachedPost =
          queryClient.getQueryData<PostResponse>(
            queryKeys.posts.detail(postId)
          ) ?? findPostInCollections(queryClient, postId);
        if (cachedPost) {
          addPostToSavedCollections(queryClient, cachedPost);
        }
      } else if (isSaved === false) {
        removePostFromSavedCollections(queryClient, postId);
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.posts.detail(postId),
      });
      queryClient.invalidateQueries({
        predicate: (query) => isSavedPostsKey(query.queryKey),
      });
    },
  });
}

export function useSharePost() {
  return useMutation({
    mutationFn: ({
      postId,
      data,
    }: {
      postId: number;
      data: SharePostRequest;
    }) => postsApi.sharePost(postId, data),
  });
}
