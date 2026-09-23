import type { CommentResponse, Comment } from '../types';

export const mapCommentResponseToComment = (comment: CommentResponse): Comment => {
    return {
        id: String(comment.id ?? ''),
        author: {
            id: String(comment.authorId ?? ''),
            displayName: comment.authorName ?? 'Unknown',
            avatarUrl: comment.authorAvatarUrl ?? undefined,
        },
        content: comment.content ?? '',
        likesCount: comment.likeCount ?? 0,
        isLiked: comment.isLiked ?? false,
        createdAt: comment.timeStamp ?? new Date().toISOString(),
        parentId: comment.parentCommentId ? String(comment.parentCommentId) : undefined,
    };
};
