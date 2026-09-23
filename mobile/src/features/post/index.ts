/**
 * Post Feature - Public API
 */

// Components
export { PostCard } from './components/PostCard';
export { PostDetailScreen } from './components/PostDetailScreen';

// Screens
export { CreatePostScreen } from './screens/CreatePostScreen';

// Create Post Components
export { ChooseChannelSheet } from './components/ChooseChannelSheet';
export { ChooseItinerarySheet } from './components/ChooseItinerarySheet';
export { SegmentedTabs } from './components/SegmentedTabs';
export { SelectedChannelCard } from './components/SelectedChannelCard';
export { SelectedItineraryCard } from './components/SelectedItineraryCard';

// Hooks
export {
    useCreateComment, usePostDetail, useToggleCommentLike, useTogglePostLike
} from './hooks/usePostDetail';
export { useCreatePost } from './hooks/usePosts';

// Types
export type {
    Comment,
    CommentAuthor, CreatePostFormData, CreatePostRequest, Post,
    PostDetail,
    PostDetailAuthor,
    PostDetailLocation, PostDetailResponse, PostVisibility
} from './types';

export type {
    ChannelForSelection,
    CreatePostTab,
    ItineraryForSelection
} from './types/createPost.types';

