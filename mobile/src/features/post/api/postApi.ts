import { apiClient, createMultipartData, type FileUpload } from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiResponse } from '@/shared/types/api.types';
import type { Slice } from '@/shared/types/pagination.types';
import type {
    PostResponse,
    SavedPostResponse,
    SharePostRequest,
    SharePostResponse,
    CommentRequest,
    CommentResponse,
    LikeResponse,
    PostSearchParams,
    CreatePostFormData,
    UpdatePostFormData,
} from '../types';

export const postsApi = {
    createPost: (data: CreatePostFormData): Promise<ApiResponse<PostResponse>> => {
        const formData = createMultipartData(
            {
                content: data.content,
                postType: data.postType,
                visibility: data.visibility,
                tourId: data.tourId,
                locations: data.locations,
            },
            data.files as FileUpload[] | undefined
        );
        return apiClient.postMultipart<ApiResponse<PostResponse>>(
            API_ENDPOINTS.POSTS.CREATE,
            formData
        );
    },

    getPost: (postId: number): Promise<ApiResponse<PostResponse>> =>
        apiClient.get<ApiResponse<PostResponse>>(API_ENDPOINTS.POSTS.BY_ID(postId)),

    getFeed: (params: PostSearchParams): Promise<ApiResponse<Slice<PostResponse>>> =>
        apiClient.get<ApiResponse<Slice<PostResponse>>>(API_ENDPOINTS.POSTS.LIST, { params }),

    getMyPosts: (params: PostSearchParams): Promise<ApiResponse<Slice<PostResponse>>> =>
        apiClient.get<ApiResponse<Slice<PostResponse>>>(API_ENDPOINTS.POSTS.MY_POSTS, { params }),

    getSavedPosts: (params: PostSearchParams): Promise<ApiResponse<Slice<PostResponse>>> =>
        apiClient.get<ApiResponse<Slice<PostResponse>>>(API_ENDPOINTS.POSTS.SAVED_POSTS, {
            params,
        }),

    updatePost: (postId: number, data: UpdatePostFormData): Promise<ApiResponse<PostResponse>> => {
        const formData = createMultipartData(
            {
                content: data.content,
                postType: data.postType,
                visibility: data.visibility,
                tourId: data.tourId,
                locations: data.locations,
            },
            data.files as FileUpload[] | undefined
        );
        return apiClient.putMultipart<ApiResponse<PostResponse>>(
            API_ENDPOINTS.POSTS.BY_ID(postId),
            formData
        );
    },

    deletePost: (postId: number): Promise<ApiResponse<void>> =>
        apiClient.delete<ApiResponse<void>>(API_ENDPOINTS.POSTS.BY_ID(postId)),

    savePost: (postId: number): Promise<ApiResponse<SavedPostResponse>> =>
        apiClient.post<ApiResponse<SavedPostResponse>>(API_ENDPOINTS.POSTS.SAVE(postId)),

    sharePost: (
        postId: number,
        data: SharePostRequest
    ): Promise<ApiResponse<SharePostResponse>> =>
        apiClient.post<ApiResponse<SharePostResponse>>(API_ENDPOINTS.POSTS.SHARE(postId), data),
};

export const commentsApi = {
    getPostComments: (
        postId: number,
        params: PostSearchParams
    ): Promise<ApiResponse<Slice<CommentResponse>>> =>
        apiClient.get<ApiResponse<Slice<CommentResponse>>>(API_ENDPOINTS.POSTS.COMMENTS(postId), {
            params,
        }),

    createComment: (data: CommentRequest): Promise<ApiResponse<CommentResponse>> =>
        apiClient.post<ApiResponse<CommentResponse>>(API_ENDPOINTS.COMMENTS.CREATE, data),

    updateComment: (commentId: number, data: CommentRequest): Promise<ApiResponse<CommentResponse>> =>
        apiClient.put<ApiResponse<CommentResponse>>(API_ENDPOINTS.COMMENTS.UPDATE(commentId), data),

    deleteComment: (commentId: number): Promise<ApiResponse<void>> =>
        apiClient.delete<ApiResponse<void>>(API_ENDPOINTS.COMMENTS.DELETE(commentId)),

    getCommentReplies: (
        commentId: number,
        params: PostSearchParams
    ): Promise<ApiResponse<Slice<CommentResponse>>> =>
        apiClient.get<ApiResponse<Slice<CommentResponse>>>(
            API_ENDPOINTS.COMMENTS.REPLIES(commentId),
            { params }
        ),
};

export const reactionsApi = {
    likePost: (postId: number): Promise<ApiResponse<LikeResponse>> =>
        apiClient.post<ApiResponse<LikeResponse>>(API_ENDPOINTS.REACTIONS.LIKE_POST(postId)),

    likeComment: (commentId: number): Promise<ApiResponse<LikeResponse>> =>
        apiClient.post<ApiResponse<LikeResponse>>(API_ENDPOINTS.REACTIONS.LIKE_COMMENT(commentId)),
};
