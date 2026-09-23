package com.example.vnuguideapp.service.PostAndInteractions;

import com.example.vnuguideapp.dto.event.MessageEvent;
import com.example.vnuguideapp.dto.event.PostAndInteractions.CommentState;
import com.example.vnuguideapp.dto.event.PostAndInteractions.PostState;
import com.example.vnuguideapp.dto.reponse.PostAndInteractions.LikeResponse;
import com.example.vnuguideapp.entity.AccountAndAuthorization.User;
import com.example.vnuguideapp.entity.PostAndInteractions.Comment;
import com.example.vnuguideapp.entity.PostAndInteractions.Post;
import com.example.vnuguideapp.entity.PostAndInteractions.Reaction;
import com.example.vnuguideapp.enums.MessageEventType;
import com.example.vnuguideapp.exception.exceptionImpl.ResourceNotFoundException;
import com.example.vnuguideapp.repository.PostAndInteractions.CommentRepository;
import com.example.vnuguideapp.repository.PostAndInteractions.PostRepository;
import com.example.vnuguideapp.repository.PostAndInteractions.ReactionRepository;
import com.example.vnuguideapp.service.Notification.NotificationService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ReactionService {

        ReactionRepository reactionRepository;
        PostRepository postRepository;
        CommentRepository commentRepository;
        SimpMessagingTemplate messagingTemplate;
        @Lazy
        NotificationService notificationService;

        /**
         * Toggle like on a post (like/unlike)
         */
        public LikeResponse toggleLikePost(User user, Long postId) {
                Post post = postRepository.findById(postId)
                                .orElseThrow(() -> new ResourceNotFoundException("Post not found"));

                Optional<Reaction> existingReaction = reactionRepository.findByPostIdAndUserId(postId, user.getId());

                boolean isLiked;
                if (existingReaction.isPresent()) {
                        // Unlike
                        reactionRepository.delete(existingReaction.get());
                        post.setReactionCount(post.getReactionCount() - 1);
                        isLiked = false;
                } else {
                        // Like
                        Reaction reaction = Reaction.builder()
                                        .post(post)
                                        .user(user)
                                        .build();
                        reactionRepository.save(reaction);
                        post.setReactionCount(post.getReactionCount() + 1);

                        // Send notification to post owner
                        if (post.getUser() != null && !post.getUser().getId().equals(user.getId())) {
                                notificationService.notifyPostReaction(post.getUser(), user, postId, "thích");
                        }
                        isLiked = true;
                }

                postRepository.save(post);

                // Broadcast state
                broadcastPostState(postId);

                return LikeResponse.builder()
                                .postId(postId)
                                .userId(user.getId())
                                .isLiked(isLiked)
                                .likeCount(post.getReactionCount())
                                .build();
        }

        /**
         * Toggle like on a comment (like/unlike)
         */
        public LikeResponse toggleLikeComment(User user, Long commentId) {
                Comment comment = commentRepository.findById(commentId)
                                .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));

                Optional<Reaction> existingReaction = reactionRepository.findByCommentIdAndUserId(commentId,
                                user.getId());

                boolean isLiked;
                if (existingReaction.isPresent()) {
                        // Unlike
                        reactionRepository.delete(existingReaction.get());
                        isLiked = false;
                } else {
                        // Like
                        Reaction reaction = Reaction.builder()
                                        .comment(comment)
                                        .user(user)
                                        .build();
                        reactionRepository.save(reaction);
                        isLiked = true;
                }

                // Broadcast state
                long likeCount = reactionRepository.countByCommentId(commentId);
                broadcastCommentState(commentId);

                return LikeResponse.builder()
                                .commentId(commentId)
                                .userId(user.getId())
                                .isLiked(isLiked)
                                .likeCount(likeCount)
                                .build();
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
