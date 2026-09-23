package com.example.vivuapp.service.PostAndInteractions;

import com.example.vivuapp.dto.event.MessageEvent;
import com.example.vivuapp.dto.event.PostAndInteractions.CommentState;
import com.example.vivuapp.dto.event.PostAndInteractions.PostState;
import com.example.vivuapp.dto.reponse.PostAndInteractions.CommentResponse;
import com.example.vivuapp.dto.request.PostAndInteractions.CommentRequest;
import com.example.vivuapp.entity.AccountAndAuthorization.User;
import com.example.vivuapp.entity.AccountAndAuthorization.UserProfile;
import com.example.vivuapp.entity.PostAndInteractions.Comment;
import com.example.vivuapp.entity.PostAndInteractions.Post;
import com.example.vivuapp.enums.MessageEventType;
import com.example.vivuapp.exception.exceptionImpl.ForbiddenException;
import com.example.vivuapp.exception.exceptionImpl.ResourceNotFoundException;
import com.example.vivuapp.repository.AccountAndAuthorization.UserProfileRepository;
import com.example.vivuapp.repository.PostAndInteractions.CommentRepository;
import com.example.vivuapp.repository.PostAndInteractions.PostRepository;
import com.example.vivuapp.repository.PostAndInteractions.ReactionRepository;
import com.example.vivuapp.service.Notification.NotificationService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CommentService {

        CommentRepository commentRepository;
        PostRepository postRepository;
        ReactionRepository reactionRepository;
        UserProfileRepository userProfileRepository;
        SimpMessagingTemplate messagingTemplate;
        @Lazy
        NotificationService notificationService;

        public CommentResponse createComment(User user, CommentRequest commentRequest) {
                // Find post (any user can comment on a post)
                Post post = postRepository.findById(commentRequest.postId())
                                .orElseThrow(() -> new ResourceNotFoundException("Post not found"));

                // Find parent comment if exists
                Comment parentComment = null;
                if (commentRequest.parentCommentId() != null) {
                        parentComment = commentRepository.findById(commentRequest.parentCommentId())
                                        .orElseThrow(() -> new ResourceNotFoundException("Parent comment not found"));
                }

                Comment comment = Comment.builder()
                                .user(user)
                                .content(commentRequest.content())
                                .post(post)
                                .parentComment(parentComment)
                                .build();

                Comment savedComment = commentRepository.save(comment);

                // Update post comment count
                post.setCommentCount(post.getCommentCount() + 1);
                postRepository.save(post);

                // Notify post subscribers
                broadcastPostState(post.getId());

                // Notify parent comment subscribers if this is a reply
                if (parentComment != null) {
                        broadcastCommentState(parentComment.getId());
                        // Send notification to parent comment author
                        if (parentComment.getUser() != null && !parentComment.getUser().getId().equals(user.getId())) {
                                notificationService.notifyCommentReply(
                                                parentComment.getUser(), user, post.getId(),
                                                savedComment.getId(), commentRequest.content());
                        }
                } else {
                        // Send notification to post owner for top-level comment
                        if (post.getUser() != null && !post.getUser().getId().equals(user.getId())) {
                                notificationService.notifyPostComment(
                                                post.getUser(), user, post.getId(),
                                                savedComment.getId(), commentRequest.content());
                        }
                }

                return buildCommentResponse(savedComment, user);
        }

        public CommentResponse updateComment(User user, Long commentId, CommentRequest commentRequest) {
                Comment comment = commentRepository.findById(commentId)
                                .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));

                // Only the comment author can update
                if (!comment.getUser().getId().equals(user.getId())) {
                        throw new ForbiddenException("You don't have permission to update this comment");
                }

                comment.setContent(commentRequest.content());
                Comment updatedComment = commentRepository.save(comment);

                return buildCommentResponse(updatedComment, user);
        }

        public Slice<CommentResponse> getCommentsByPostId(Long postId, Pageable pageable, User user) {
                // Verify post exists
                if (!postRepository.existsById(postId)) {
                        throw new ResourceNotFoundException("Post not found");
                }

                // Get top-level comments only (parentComment is null)
                Slice<Comment> comments = commentRepository
                                .findByPostIdAndParentCommentIsNullOrderByCreatedAtDesc(postId, pageable);
                return comments.map(comment -> buildCommentResponse(comment, user));
        }

        public Slice<CommentResponse> getReplies(Long parentCommentId, Pageable pageable, User user) {
                // Verify parent comment exists
                if (!commentRepository.existsById(parentCommentId)) {
                        throw new ResourceNotFoundException("Parent comment not found");
                }

                Slice<Comment> replies = commentRepository
                                .findByParentCommentIdOrderByCreatedAtAsc(parentCommentId, pageable);
                return replies.map(comment -> buildCommentResponse(comment, user));
        }

        public void deleteComment(User user, Long commentId) {
                Comment comment = commentRepository.findById(commentId)
                                .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));

                // Comment author OR post owner can delete
                boolean isCommentAuthor = comment.getUser().getId().equals(user.getId());
                boolean isPostOwner = comment.getPost().getUser().getId().equals(user.getId());

                if (!isCommentAuthor && !isPostOwner) {
                        throw new ForbiddenException("You don't have permission to delete this comment");
                }

                Post post = comment.getPost();
                Long parentCommentId = comment.getParentComment() != null ? comment.getParentComment().getId() : null;

                commentRepository.delete(comment);

                // Update post comment count
                post.setCommentCount(post.getCommentCount() - 1);
                postRepository.save(post);

                // Notify post subscribers
                broadcastPostState(post.getId());

                // Notify parent comment subscribers if this was a reply
                if (parentCommentId != null) {
                        broadcastCommentState(parentCommentId);
                }
        }

        private CommentResponse buildCommentResponse(Comment comment, User currentUser) {
                User author = comment.getUser();
                UserProfile profile = author != null
                                ? userProfileRepository.findByUserId(author.getId()).orElse(null)
                                : null;
                String authorName = resolveDisplayName(author, profile);
                String authorAvatarUrl = profile != null ? profile.getAvatarUrl() : null;
                Integer likeCount = reactionRepository.countByCommentId(comment.getId()).intValue();
                boolean isLiked = currentUser != null && reactionRepository
                                .findByCommentIdAndUserId(comment.getId(), currentUser.getId())
                                .isPresent();

                return CommentResponse.builder()
                                .id(comment.getId())
                                .authorId(author != null ? author.getId() : null)
                                .authorName(authorName)
                                .authorAvatarUrl(authorAvatarUrl)
                                .parentCommentId(comment.getParentComment() != null ? comment.getParentComment().getId()
                                                : null)
                                .postId(comment.getPost().getId())
                                .content(comment.getContent())
                                .likeCount(likeCount)
                                .isLiked(isLiked)
                                .timeStamp(comment.getCreatedAt())
                                .build();
        }

        private String resolveDisplayName(User user, UserProfile profile) {
                if (profile != null && profile.getDisplayName() != null && !profile.getDisplayName().isBlank()) {
                        return profile.getDisplayName();
                }
                if (user == null) {
                        return null;
                }
                String fullName = String.format("%s %s",
                                user.getFirstName() != null ? user.getFirstName() : "",
                                user.getLastName() != null ? user.getLastName() : "").trim();
                if (!fullName.isBlank()) {
                        return fullName;
                }
                return user.getUsername();
        }

        private void broadcastPostState(Long postId) {
                messagingTemplate.convertAndSend(
                                "/topic/post." + postId,
                                new MessageEvent<>(
                                                MessageEventType.POST_CHANGED,
                                                PostState.builder()
                                                                .postId(postId)
                                                                .commentCount(commentRepository.countByPostId(postId))
                                                                .reactionCount(reactionRepository.countByPostId(postId))
                                                                .build()));
        }

        private void broadcastCommentState(Long commentId) {
                messagingTemplate.convertAndSend(
                                "/topic/comment." + commentId,
                                new MessageEvent<>(
                                                MessageEventType.COMMENT_CHANGED,
                                                CommentState.builder()
                                                                .commentId(commentId)
                                                                .commentCount(commentRepository
                                                                                .countByParentComment_Id(commentId))
                                                                .reactionCount(reactionRepository
                                                                                .countByCommentId(commentId))
                                                                .build()));
        }
}
