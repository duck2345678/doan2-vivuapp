package com.example.vivuapp.service.PostAndInteractions;

import com.example.vivuapp.dto.event.MessageEvent;
import com.example.vivuapp.dto.reponse.PostAndInteractions.PostResponse;
import com.example.vivuapp.dto.reponse.PostAndInteractions.SavedPostResponse;
import com.example.vivuapp.dto.reponse.PostAndInteractions.SharePostResponse;
import com.example.vivuapp.dto.request.PostAndInteractions.PostLocationRequest;
import com.example.vivuapp.dto.request.PostAndInteractions.SharePostRequest;
import com.example.vivuapp.entity.AccountAndAuthorization.User;
import com.example.vivuapp.entity.AccountAndAuthorization.UserProfile;
import com.example.vivuapp.entity.ChatAndActivity.Conversation;
import com.example.vivuapp.entity.ChatAndActivity.Message;
import com.example.vivuapp.entity.PostAndInteractions.Post;
import com.example.vivuapp.entity.PostAndInteractions.PostLocation;
import com.example.vivuapp.entity.PostAndInteractions.PostMedia;
import com.example.vivuapp.entity.PostAndInteractions.SavedPost;
import com.example.vivuapp.entity.Storage.FileEntity;
import com.example.vivuapp.entity.TourAndCheckInAndItinerary.Tour;
import com.example.vivuapp.enums.FileCategory;
import com.example.vivuapp.enums.MessageEventType;
import com.example.vivuapp.enums.MessageType;
import com.example.vivuapp.enums.PostType;
import com.example.vivuapp.enums.Visibility;
import com.example.vivuapp.exception.exceptionImpl.BadRequestException;
import com.example.vivuapp.exception.exceptionImpl.ForbiddenException;
import com.example.vivuapp.exception.exceptionImpl.ResourceNotFoundException;
import com.example.vivuapp.repository.AccountAndAuthorization.UserProfileRepository;
import com.example.vivuapp.repository.ChatAndActivity.ConversationRepository;
import com.example.vivuapp.repository.ChatAndActivity.MessageRepository;
import com.example.vivuapp.repository.PostAndInteractions.CommentRepository;
import com.example.vivuapp.repository.PostAndInteractions.PostRepository;
import com.example.vivuapp.repository.PostAndInteractions.ReactionRepository;
import com.example.vivuapp.repository.PostAndInteractions.SavedPostRepository;
import com.example.vivuapp.repository.TourAndCheckInAndItinerary.TourRepository;
import com.example.vivuapp.service.File.FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.Sort;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = lombok.AccessLevel.PRIVATE)
public class PostService {

        private static final int POST_COOLDOWN_SECONDS = 30;
        private static final long MAX_FILE_SIZE_BYTES = 20L * 1024 * 1024;

        PostRepository postRepository;
        TourRepository tourRepository;
        FileStorageService fileStorageService;
        SavedPostRepository savedPostRepository;
        ConversationRepository conversationRepository;
        MessageRepository messageRepository;
        UserProfileRepository userProfileRepository;
        ReactionRepository reactionRepository;
        CommentRepository commentRepository;
        SimpMessagingTemplate messagingTemplate;

        public PostResponse createPostWithFiles(
                        User user,
                        String content,
                        PostType postType,
                        Visibility visibility,
                        Long tourId,
                        List<PostLocationRequest> locations,
                        List<MultipartFile> files) {

                String normalizedContent = normalizeContent(content);
                validatePostContent(normalizedContent, files, null, locations, null);
                validateFiles(files);

                // 1. Check cooldown
                LocalDateTime lastPostTime = postRepository.findLastPostTimeByUserId(user.getId());
                if (lastPostTime != null
                                && lastPostTime.plusSeconds(POST_COOLDOWN_SECONDS).isAfter(LocalDateTime.now())) {
                        throw new BadRequestException("Please wait " + POST_COOLDOWN_SECONDS
                                        + " seconds before creating another post");
                }

                // 2. Build post
                Post post = Post.builder()
                                .content(normalizedContent)
                                .postType(postType)
                                .visibility(visibility)
                                .user(user)
                                .tour(tourId != null
                                                ? tourRepository.findById(tourId)
                                                                .orElseThrow(() -> new ResourceNotFoundException(
                                                                                "Tour not found"))
                                                : null)
                                .build();

                // 3. Add locations
                List<PostLocation> postLocations = buildPostLocations(post, locations);
                post.getPostLocations().addAll(postLocations);

                // 4. Upload files and create PostMedia (auto-detect FileType)
                List<PostMedia> postMedias = buildPostMedia(post, files);
                post.setPostMedia(postMedias);
                Post savedPost = postRepository.save(post);

                return buildPostResponse(savedPost, false);
        }

        private PostResponse buildPostResponse(Post post, Boolean isLiked) {
                User author = post.getUser();
                UserProfile profile = author != null
                                ? userProfileRepository.findByUserId(author.getId()).orElse(null)
                                : null;
                String authorName = resolveDisplayName(author, profile);
                String authorAvatarUrl = profile != null ? profile.getAvatarUrl() : null;
                return PostResponse.builder()
                                .id(post.getId())
                                .content(post.getContent())
                                .postType(post.getPostType())
                                .visibility(post.getVisibility())
                                .authorId(author != null ? author.getId() : null)
                                .authorName(authorName)
                                .authorAvatarUrl(authorAvatarUrl)
                                .mediaUrls(post.getPostMedia().stream()
                                                .map(PostMedia::getMediaUrl)
                                                .toList())
                                .locations(post.getPostLocations().stream()
                                                .map(location -> com.example.vivuapp.dto.reponse.PostAndInteractions.PostLocationResponse.builder()
                                                                .id(location.getId())
                                                                .name(location.getName())
                                                                .address(location.getAddress())
                                                                .lat(location.getLat())
                                                                .lng(location.getLng())
                                                                .placeId(location.getPlaceId())
                                                                .build())
                                                .toList())
                                .reactionCount(post.getReactionCount())
                                .commentCount(post.getCommentCount())
                                .isLiked(isLiked)
                                .createdAt(post.getCreatedAt())
                                .updatedAt(post.getUpdatedAt())
                                .build();
        }

        public PostResponse getPostById(Long postId, User user) {
                Post post = postRepository.findById(postId)
                                .orElseThrow(() -> new ResourceNotFoundException("Post not found"));

                // Check visibility
                if (post.getVisibility() != Visibility.PUBLIC) {
                        // Only owner can view private posts
                        if (user == null || !post.getUser().getId().equals(user.getId())) {
                                throw new ForbiddenException("You don't have permission to view this post");
                        }
                }

                boolean isLiked = user != null && reactionRepository
                                .findByPostIdAndUserId(post.getId(), user.getId())
                                .isPresent();
                return buildPostResponse(post, isLiked);
        }

        public Slice<PostResponse> getFeed(User user, Pageable pageable) {
                Pageable sortedPageable = PageRequest.of(
                                pageable.getPageNumber(),
                                pageable.getPageSize(),
                                Sort.by("createdAt").descending());
                Slice<Post> postSlice = postRepository.findByVisibilityInOrderByCreatedAtDesc(
                                List.of(Visibility.PUBLIC), sortedPageable);
                return mapSliceWithLikes(postSlice, user);
        }

        public Slice<PostResponse> getMyPosts(User user, Pageable pageable) {
                Slice<Post> postSlice = postRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), pageable);
                return mapSliceWithLikes(postSlice, user);
        }

        public Slice<PostResponse> getPostsByUserId(Long userId, User currentUser, Pageable pageable) {
                // Get public posts from the specified user
                Slice<Post> postSlice = postRepository.findByUserIdAndVisibilityInOrderByCreatedAtDesc(
                                userId, List.of(Visibility.PUBLIC), pageable);
                return mapSliceWithLikes(postSlice, currentUser);
        }

        public SavedPostResponse toggleSavePost(User user, Long postId) {
                Post post = postRepository.findById(postId)
                                .orElseThrow(() -> new ResourceNotFoundException("Post not found"));

                var existingSave = savedPostRepository.findByUserIdAndPostId(user.getId(), postId);

                boolean isSaved;
                if (existingSave.isPresent()) {
                        // Unsave
                        savedPostRepository.delete(existingSave.get());
                        isSaved = false;
                } else {
                        // Save
                        SavedPost savedPost = SavedPost.builder()
                                        .user(user)
                                        .post(post)
                                        .build();
                        savedPostRepository.save(savedPost);
                        isSaved = true;
                }

                return SavedPostResponse.builder()
                                .postId(postId)
                                .userId(user.getId())
                                .isSaved(isSaved)
                                .build();
        }

        public Slice<PostResponse> getSavedPosts(User user, Pageable pageable) {
                Slice<SavedPost> savedSlice = savedPostRepository.findByUserIdOrderBySavedAtDesc(user.getId(),
                                pageable);
                List<Post> posts = savedSlice.getContent().stream()
                                .map(SavedPost::getPost)
                                .toList();
                Set<Long> likedPostIds = getLikedPostIds(user, posts);
                return savedSlice.map(savedPost -> buildPostResponse(savedPost.getPost(),
                                likedPostIds.contains(savedPost.getPost().getId())));
        }

        public SharePostResponse sharePost(User user, Long postId, SharePostRequest request) {
                // Verify post exists
                Post post = postRepository.findById(postId)
                                .orElseThrow(() -> new ResourceNotFoundException("Post not found"));

                // Verify conversation exists
                Conversation conversation = conversationRepository.findById(request.conversationId())
                                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));

                // Create shared message with post reference
                String content = request.message() != null ? request.message() : "";

                Message message = Message.builder()
                                .sender(user)
                                .content(content)
                                .type(MessageType.SHARED_POST)
                                .sharedPostId(postId)
                                .conversation(conversation)
                                .build();

                Message saved = messageRepository.save(message);

                // Update conversation last message
                conversation.setLastMessage(saved);
                conversationRepository.save(conversation);

                SharePostResponse response = SharePostResponse.builder()
                                .messageId(saved.getId())
                                .postId(postId)
                                .conversationId(request.conversationId())
                                .senderId(user.getId())
                                .senderName(user.getFirstName() + " " + user.getLastName())
                                .message(request.message())
                                .messageType(MessageType.SHARED_POST)
                                .timestamp(saved.getCreatedAt())
                                .build();

                // Broadcast to all participants in conversation
                messagingTemplate.convertAndSend("/topic/message." + request.conversationId(),
                                new MessageEvent<>(MessageEventType.SEND, response));

                return response;
        }

        @org.springframework.transaction.annotation.Transactional
        public void deletePost(Long postId, User user) {
                Post post = postRepository.findByIdAndUserId(postId, user.getId())
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Post not found or you don't have permission to delete this post"));
                
                // Delete reactions on comments first
                var comments = commentRepository.findByPostId(postId);
                for (var comment : comments) {
                        reactionRepository.deleteByCommentId(comment.getId());
                }
                
                // Delete comments
                commentRepository.deleteByPostId(postId);
                
                // Delete post reactions
                reactionRepository.deleteByPostId(postId);
                
                // Delete saved posts
                savedPostRepository.deleteByPostId(postId);
                
                postRepository.delete(post);
        }

        public PostResponse updatePost(Long postId, User user, PostType postType, Visibility visibility,
                        String content, Long tourId, List<PostLocationRequest> locations, List<MultipartFile> files) {

                Post post = postRepository.findByIdAndUserId(postId, user.getId())
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Post not found or you don't have permission to update this post"));

                // Update basic info
                String normalizedContent = normalizeContent(content);
                if (content != null) {
                        post.setContent(normalizedContent);
                }
                post.setPostType(postType);
                post.setVisibility(visibility);

                if (tourId != null) {
                        Tour tour = tourRepository.findById(tourId)
                                        .orElseThrow(() -> new ResourceNotFoundException("Tour not found"));
                        post.setTour(tour);
                }

                if (locations != null) {
                        List<PostLocation> postLocations = buildPostLocations(post, locations);
                        post.getPostLocations().clear();
                        post.getPostLocations().addAll(postLocations);
                }

                // Update media if new files provided (auto-detect FileType)
                if (files != null && !files.isEmpty()) {
                        validateFiles(files);
                        List<PostMedia> postMedias = buildPostMedia(post, files);
                        post.getPostMedia().clear();
                        post.getPostMedia().addAll(postMedias);
                }

                String effectiveContent = content != null ? normalizedContent : post.getContent();
                validatePostContent(effectiveContent, files, post.getPostMedia(), locations, post.getPostLocations());
                Post updatedPost = postRepository.save(post);
                boolean isLiked = reactionRepository.findByPostIdAndUserId(postId, user.getId()).isPresent();
                return buildPostResponse(updatedPost, isLiked);
        }

        private void validatePostContent(String content,
                        List<MultipartFile> files,
                        List<PostMedia> existingMedia,
                        List<PostLocationRequest> locations,
                        List<PostLocation> existingLocations) {
                boolean hasContent = content != null && !content.isBlank();
                boolean hasFiles = files != null && !files.isEmpty();
                boolean hasExistingMedia = existingMedia != null && !existingMedia.isEmpty();
                boolean hasLocations = locations != null && !locations.isEmpty();
                boolean hasExistingLocations = existingLocations != null && !existingLocations.isEmpty();
                if (!hasContent && !hasFiles && !hasExistingMedia && !hasLocations && !hasExistingLocations) {
                        throw new BadRequestException("Post must have content or media");
                }
        }

        private void validateFiles(List<MultipartFile> files) {
                if (files == null) {
                        return;
                }
                for (MultipartFile file : files) {
                        if (file.isEmpty()) {
                                throw new BadRequestException("One of the files is empty");
                        }
                        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
                                throw new BadRequestException("One of the files exceeds 20MB limit");
                        }
                }
        }

        private String normalizeContent(String content) {
                if (content == null) {
                        return null;
                }
                String trimmed = content.trim();
                return trimmed.isEmpty() ? null : trimmed;
        }

        private List<PostMedia> buildPostMedia(Post post, List<MultipartFile> files) {
                List<PostMedia> postMedias = new ArrayList<>();
                if (files == null || files.isEmpty()) {
                        return postMedias;
                }
                List<FileEntity> uploadedFiles = fileStorageService.uploadMultipleFiles(files,
                                FileCategory.POST_MEDIA);

                AtomicInteger index = new AtomicInteger(0);
                for (FileEntity fileEntity : uploadedFiles) {
                        PostMedia media = PostMedia.builder()
                                        .post(post)
                                        .file(fileEntity)
                                        .sortOrder(index.getAndIncrement())
                                        .build();
                        postMedias.add(media);
                }
                return postMedias;
        }

        private List<PostLocation> buildPostLocations(Post post, List<PostLocationRequest> locations) {
                List<PostLocation> postLocations = new ArrayList<>();
                if (locations == null || locations.isEmpty()) {
                        return postLocations;
                }
                for (PostLocationRequest location : locations) {
                        if (location == null) {
                                continue;
                        }
                        String name = location.name();
                        if (name == null || name.isBlank()) {
                                name = location.address();
                        }
                        if (name == null || name.isBlank()) {
                                continue;
                        }
                        PostLocation postLocation = PostLocation.builder()
                                        .post(post)
                                        .name(name)
                                        .address(location.address())
                                        .lat(location.lat())
                                        .lng(location.lng())
                                        .placeId(location.placeId())
                                        .build();
                        postLocations.add(postLocation);
                }
                return postLocations;
        }

        private Slice<PostResponse> mapSliceWithLikes(Slice<Post> postSlice, User user) {
                List<Post> posts = postSlice.getContent();
                Set<Long> likedPostIds = getLikedPostIds(user, posts);
                return postSlice.map(post -> buildPostResponse(post,
                                likedPostIds.contains(post.getId())));
        }

        private Set<Long> getLikedPostIds(User user, List<Post> posts) {
                if (user == null || posts == null || posts.isEmpty()) {
                        return Set.of();
                }
                List<Long> postIds = posts.stream()
                                .map(Post::getId)
                                .toList();
                return new HashSet<>(reactionRepository.findReactedPostIds(user.getId(), postIds));
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
}
