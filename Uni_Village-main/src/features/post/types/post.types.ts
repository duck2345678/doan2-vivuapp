import type { FileUpload } from "@/lib/api";
import type {
  CommentRequest as BackendCommentRequest,
  CommentResponse as BackendCommentResponse,
  LikeResponse as BackendLikeResponse,
  PostResponse as BackendPostResponse,
  SavedPostResponse as BackendSavedPostResponse,
  SharePostRequest as BackendSharePostRequest,
  SharePostResponse as BackendSharePostResponse,
} from "@/shared/types/backend.types";
import { PostType, Visibility } from "@/shared/types/backend.types";

export type PostResponse = BackendPostResponse;
export type Post = BackendPostResponse;
export type CommentRequest = BackendCommentRequest;
export type CommentResponse = BackendCommentResponse;
export type LikeResponse = BackendLikeResponse;
export type SavedPostResponse = BackendSavedPostResponse;
export type SharePostRequest = BackendSharePostRequest;
export type SharePostResponse = BackendSharePostResponse;

export { PostType, Visibility };

export interface PostLocation {
  id: string | number;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
}

export interface PostSearchParams {
  page?: number;
  size?: number;
}

export interface CreatePostFormData {
  content?: string;
  postType: PostType;
  visibility: Visibility;
  tourId?: string;
  files?: FileUpload[];
  locations?: PostLocation[];
}

export interface UpdatePostFormData {
  content?: string;
  postType: PostType;
  visibility: Visibility;
  tourId?: string;
  files?: FileUpload[];
  locations?: PostLocation[];
}

// Alias for backward compatibility
export type CreatePostRequest = CreatePostFormData;
