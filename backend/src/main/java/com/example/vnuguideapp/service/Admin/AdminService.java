package com.example.vnuguideapp.service.Admin;

import com.example.vnuguideapp.dto.reponse.*;
import com.example.vnuguideapp.dto.request.*;
import com.example.vnuguideapp.entity.AccountAndAuthorization.User;
import com.example.vnuguideapp.entity.AccountAndAuthorization.UserProfile;
import com.example.vnuguideapp.entity.PlaceAndMapping.PlaceType;
import com.example.vnuguideapp.entity.PostAndInteractions.Post;
import com.example.vnuguideapp.entity.ReportAndSystemSetting.Report;
import com.example.vnuguideapp.enums.NotificationType;
import com.example.vnuguideapp.enums.ReportAction;
import com.example.vnuguideapp.enums.ReportStatus;
import com.example.vnuguideapp.enums.Status;
import com.example.vnuguideapp.repository.AccountAndAuthorization.UserProfileRepository;
import com.example.vnuguideapp.repository.AccountAndAuthorization.UserRepository;
import com.example.vnuguideapp.repository.PlaceAndMapping.PlaceRepository;
import com.example.vnuguideapp.repository.PlaceAndMapping.PlaceTypeRepository;
import com.example.vnuguideapp.repository.PostAndInteractions.CommentRepository;
import com.example.vnuguideapp.repository.PostAndInteractions.PostRepository;
import com.example.vnuguideapp.repository.ReportAndSystemSetting.ReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

  private final UserRepository userRepository;
  private final UserProfileRepository userProfileRepository;
  private final PlaceRepository placeRepository;
  private final PlaceTypeRepository placeTypeRepository;
  private final ReportRepository reportRepository;
  private final PostRepository postRepository;
  private final CommentRepository commentRepository;
  private final com.example.vnuguideapp.token.TokenRepository tokenRepository;
  private final com.example.vnuguideapp.repository.ReportAndSystemSetting.ReportTypeRepository reportTypeRepository;
  private final com.example.vnuguideapp.service.Notification.NotificationService notificationService;
  private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

  // ==================== DASHBOARD ====================

  public DashboardStatsResponse getDashboardStats() {
    long totalUsers = userRepository.count();
    long totalReports = reportRepository.countByStatus(ReportStatus.PENDING);
    long totalPosts = postRepository.count();
    long totalPlaces = placeRepository.count();
    long totalComments = commentRepository.count();

    // Get post stats for last 7 days
    List<DashboardStatsResponse.PostStatItem> postStats = getPostStatsForWeek();

    // Get user growth stats for last 7 days
    List<DashboardStatsResponse.UserGrowthItem> userGrowthStats = getUserGrowthForWeek();

    return DashboardStatsResponse.builder()
        .totalUsers(totalUsers)
        .totalReports(totalReports)
        .totalPosts(totalPosts)
        .totalPlaces(totalPlaces)
        .totalComments(totalComments)
        .postStats(postStats)
        .userGrowthStats(userGrowthStats)
        .build();
  }

  private List<DashboardStatsResponse.PostStatItem> getPostStatsForWeek() {
    List<DashboardStatsResponse.PostStatItem> stats = new ArrayList<>();
    LocalDateTime now = LocalDateTime.now();

    // Vietnamese day abbreviations
    String[] dayNames = { "CN", "T2", "T3", "T4", "T5", "T6", "T7" };

    for (int i = 6; i >= 0; i--) {
      LocalDateTime day = now.minusDays(i);
      LocalDateTime startOfDay = day.toLocalDate().atStartOfDay();
      LocalDateTime endOfDay = startOfDay.plusDays(1);

      long count = postRepository.countByCreatedAtBetween(startOfDay, endOfDay);

      int dayIndex = day.getDayOfWeek().getValue() % 7; // Sunday = 0
      stats.add(DashboardStatsResponse.PostStatItem.builder()
          .name(dayNames[dayIndex])
          .value(count)
          .build());
    }

    return stats;
  }

  private List<DashboardStatsResponse.UserGrowthItem> getUserGrowthForWeek() {
    List<DashboardStatsResponse.UserGrowthItem> stats = new ArrayList<>();
    LocalDateTime now = LocalDateTime.now();

    // Vietnamese day abbreviations
    String[] dayNames = { "CN", "T2", "T3", "T4", "T5", "T6", "T7" };

    for (int i = 6; i >= 0; i--) {
      LocalDateTime day = now.minusDays(i);
      LocalDateTime startOfDay = day.toLocalDate().atStartOfDay();
      LocalDateTime endOfDay = startOfDay.plusDays(1);

      long count = userRepository.countByCreatedAtBetween(startOfDay, endOfDay);

      int dayIndex = day.getDayOfWeek().getValue() % 7; // Sunday = 0
      stats.add(DashboardStatsResponse.UserGrowthItem.builder()
          .name(dayNames[dayIndex])
          .value(count)
          .build());
    }

    return stats;
  }

  // ==================== USERS ====================

  public PageResponse<AdminUserResponse> getUsers(int page, int size, String search, String role, String status) {
    Status statusEnum = null;
    if (status != null && !status.isEmpty()) {
      try {
        statusEnum = Status.valueOf(status.toUpperCase());
      } catch (IllegalArgumentException ignored) {
      }
    }

    Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
    Page<User> userPage = userRepository.searchForAdmin(search, role, statusEnum, pageable);

    List<AdminUserResponse> users = userPage.getContent().stream()
        .map(this::mapToAdminUserResponse)
        .collect(Collectors.toList());

    return PageResponse.<AdminUserResponse>builder()
        .data(users)
        .total(userPage.getTotalElements())
        .page(page)
        .size(size)
        .build();
  }

  public AdminUserResponse getUserById(Long id) {
    User user = userRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("User not found"));
    return mapToAdminUserResponse(user);
  }

  @Transactional
  public void updateUserStatus(Long id, UpdateUserStatusRequest request) {
    User user = userRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("User not found"));

    Status newStatus = request.getStatus();
    user.setStatus(newStatus);
    userRepository.save(user);

    // Revoke all tokens and force logout when user is locked (banned)
    if (newStatus == Status.LOCKED) {
      tokenRepository.revokeAllTokensByUserId(id);

      // Send WebSocket event to force logout user in real-time
      com.example.vnuguideapp.dto.event.ForceLogoutEvent forceLogoutEvent = com.example.vnuguideapp.dto.event.ForceLogoutEvent
          .builder()
          .type("ACCOUNT_LOCKED")
          .reason("Tài khoản của bạn đã bị khóa bởi quản trị viên.")
          .userId(id)
          .build();

      // Send to user's personal queue
      messagingTemplate.convertAndSendToUser(
          id.toString(),
          "/queue/force-logout",
          forceLogoutEvent);
    }
  }

  @Transactional
  public void sendWarning(Long id, SendWarningRequest request) {
    User user = userRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("User not found"));

    // Create notification for the user
    notificationService.createNotification(
        user,
        null, // actor is null for admin system notifications
        NotificationType.ADMIN_WARNING,
        "Cảnh báo từ quản trị viên",
        request.getMessage(),
        null, // no post reference
        null, // no comment reference
        null, // no conversation reference
        null // no user reference
    );
  }

  private AdminUserResponse mapToAdminUserResponse(User user) {
    // Get user profile for avatar
    String avatar = null;
    Optional<UserProfile> profileOpt = userProfileRepository.findByUserId(user.getId());
    if (profileOpt.isPresent()) {
      avatar = profileOpt.get().getAvatarUrl();
    }
    if (avatar == null) {
      avatar = "https://ui-avatars.com/api/?name=" +
          (user.getFirstName() != null ? user.getFirstName() : "U") +
          "&background=random";
    }

    String role = "USER";
    if (user.getRoles() != null && !user.getRoles().isEmpty()) {
      role = user.getRoles().iterator().next().getName().toUpperCase();
    }

    String fullName = ((user.getFirstName() != null ? user.getFirstName() : "") +
        " " + (user.getLastName() != null ? user.getLastName() : "")).trim();

    return AdminUserResponse.builder()
        .id(String.valueOf(user.getId()))
        .name(fullName)
        .email(user.getEmail())
        .role(role)
        .status(user.getStatus() != null ? user.getStatus().name() : "ACTIVE")
        .joinedAt(user.getCreatedAt() != null ? user.getCreatedAt().format(DateTimeFormatter.ISO_DATE) : "")
        .avatar(avatar)
        .build();
  }

  // ==================== CATEGORIES ====================

  public List<CategoryResponse> getCategories(String search) {
    List<PlaceType> types;
    if (search != null && !search.isEmpty()) {
      types = placeTypeRepository.findByNameContainingIgnoreCase(search);
    } else {
      types = placeTypeRepository.findAll();
    }

    return types.stream()
        .map(this::mapToCategoryResponse)
        .collect(Collectors.toList());
  }

  @Transactional
  public CategoryResponse createCategory(CategoryRequest request) {
    String code = request.getName().toLowerCase()
        .replaceAll("[^a-z0-9]", "-")
        .replaceAll("-+", "-");

    PlaceType placeType = PlaceType.builder()
        .code(code)
        .name(request.getName())
        .description(request.getDescription())
        .iconType(request.getIconType() != null ? request.getIconType() : "default")
        .build();

    placeType = placeTypeRepository.save(placeType);
    return mapToCategoryResponse(placeType);
  }

  @Transactional
  public CategoryResponse updateCategory(Long id, CategoryRequest request) {
    PlaceType placeType = placeTypeRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("Category not found"));

    placeType.setName(request.getName());
    placeType.setDescription(request.getDescription());
    if (request.getIconType() != null) {
      placeType.setIconType(request.getIconType());
    }

    placeType = placeTypeRepository.save(placeType);
    return mapToCategoryResponse(placeType);
  }

  @Transactional
  public void deleteCategory(Long id) {
    placeTypeRepository.deleteById(id);
  }

  private CategoryResponse mapToCategoryResponse(PlaceType type) {
    return CategoryResponse.builder()
        .id(String.valueOf(type.getId()))
        .name(type.getName())
        .description(type.getDescription())
        .iconType(type.getIconType() != null ? type.getIconType() : "default")
        .build();
  }

  // ==================== REPORTS ====================

  public PageResponse<AdminReportResponse> getReports(int page, int size, String search, String status,
      String targetType) {
    ReportStatus statusEnum = parseReportStatus(status);
    final ReportStatus finalStatusEnum = statusEnum;
    final String finalTargetType = targetType;

    Pageable pageable = PageRequest.of(page, size, Sort.by("reportedAt").descending());

    // For now, get all and filter in memory (better to add query method to
    // repository)
    Page<Report> allReports = reportRepository.findAll(pageable);

    List<AdminReportResponse> filteredReports = allReports.getContent().stream()
        .filter(report -> {
          boolean matchesStatus = finalStatusEnum == null || report.getStatus() == finalStatusEnum;
          boolean matchesTarget = finalTargetType == null || finalTargetType.isEmpty()
              || matchesTargetType(report, finalTargetType);
          return matchesStatus && matchesTarget;
        })
        .map(this::mapToAdminReportResponse)
        .collect(Collectors.toList());

    return PageResponse.<AdminReportResponse>builder()
        .data(filteredReports)
        .total(allReports.getTotalElements())
        .page(page)
        .size(size)
        .build();
  }

  private ReportStatus parseReportStatus(String status) {
    if (status != null && !status.isEmpty()) {
      try {
        return ReportStatus.valueOf(status.toUpperCase());
      } catch (IllegalArgumentException ignored) {
      }
    }
    return null;
  }

  private boolean matchesTargetType(Report report, String targetType) {
    return switch (targetType.toUpperCase()) {
      case "POST" -> report.getTargetPost() != null;
      case "COMMENT" -> report.getTargetComment() != null;
      case "USER" -> report.getTargetUser() != null;
      case "PLACE" -> report.getTargetConversation() != null;
      default -> true;
    };
  }

  @Transactional
  public void processReport(Long id, ProcessReportRequest request) {
    System.out.println("[SERVICE] Processing report with ID: " + id + " (Type: " + id.getClass().getName() + ")");
    System.out.println("[SERVICE] Request action: " + request.getAction());
    System.out.println("[SERVICE] Request note: " + request.getNote());
    
    Report report = reportRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("Report not found with ID: " + id));
    
    System.out.println("[SERVICE] Found report: " + report.getId());

    // Validate action
    if (request.getAction() == null || request.getAction().trim().isEmpty()) {
      throw new RuntimeException("Action is required");
    }

    // Map action string to enum
    ReportAction action;
    try {
      action = ReportAction.valueOf(request.getAction().toUpperCase());
    } catch (IllegalArgumentException e) {
      throw new RuntimeException("Invalid action: " + request.getAction());
    }
    
    report.setResultAction(action);
    report.setInternalNote(request.getNote());

    // Process based on action type
    switch (action) {
      case WARNING:
        // TODO: Implement notification system for warnings
        // For now, just mark as resolved
        report.setStatus(ReportStatus.RESOLVED);
        break;

      case BAN_USER:
        // Determine which user to ban based on report target
        User userToBan = null;
        if (report.getTargetUser() != null) {
          userToBan = report.getTargetUser();
        } else if (report.getTargetPost() != null && report.getTargetPost().getUser() != null) {
          userToBan = report.getTargetPost().getUser();
        } else if (report.getTargetComment() != null && report.getTargetComment().getUser() != null) {
          userToBan = report.getTargetComment().getUser();
        }

        if (userToBan != null) {
          userToBan.setStatus(com.example.vnuguideapp.enums.Status.LOCKED);
          userRepository.save(userToBan);
          // Revoke all tokens
          tokenRepository.revokeAllTokensByUserId(userToBan.getId());

          // Send WebSocket event to force logout user in real-time
          com.example.vnuguideapp.dto.event.ForceLogoutEvent banEvent = com.example.vnuguideapp.dto.event.ForceLogoutEvent
              .builder()
              .type("ACCOUNT_LOCKED")
              .reason("Tài khoản của bạn đã bị khóa do vi phạm quy định cộng đồng.")
              .userId(userToBan.getId())
              .build();
          messagingTemplate.convertAndSendToUser(
              userToBan.getId().toString(),
              "/queue/force-logout",
              banEvent);
        }
        report.setStatus(ReportStatus.RESOLVED);
        break;

      case HIDE_POST:
        if (report.getTargetPost() != null) {
          Post post = report.getTargetPost();
          post.setVisibility(com.example.vnuguideapp.enums.Visibility.HIDDEN);
          postRepository.save(post);
        } else {
          throw new RuntimeException("Cannot hide post: Target post not found");
        }
        report.setStatus(ReportStatus.RESOLVED);
        break;

      case HIDE_COMMENT:
        if (report.getTargetComment() != null) {
          com.example.vnuguideapp.entity.PostAndInteractions.Comment comment = report.getTargetComment();
          comment.setIsDeleted(true);
          // Comment will be saved through report save cascade
        } else {
          throw new RuntimeException("Cannot hide comment: Target comment not found");
        }
        report.setStatus(ReportStatus.RESOLVED);
        break;

      case NO_VIOLATION:
      case REJECT:
        report.setStatus(ReportStatus.REJECTED);
        break;

      default:
        report.setStatus(ReportStatus.RESOLVED);
        break;
    }

    report.setResolvedAt(LocalDateTime.now());
    reportRepository.save(report);
  }

  private AdminReportResponse mapToAdminReportResponse(Report report) {
    // Reporter info
    User reporter = report.getReporter();
    String reporterAvatar = "https://ui-avatars.com/api/?name=" +
        (reporter.getFirstName() != null ? reporter.getFirstName() : "R") + "&background=random";

    String reporterName = ((reporter.getFirstName() != null ? reporter.getFirstName() : "") +
        " " + (reporter.getLastName() != null ? reporter.getLastName() : "")).trim();

    AdminReportResponse.ReporterInfo reporterInfo = AdminReportResponse.ReporterInfo.builder()
        .name(reporterName)
        .avatar(reporterAvatar)
        .time(formatRelativeTime(report.getReportedAt()))
        .build();

    // Target info
    AdminReportResponse.TargetInfo targetInfo = buildTargetInfo(report);

    // Violation info
    AdminReportResponse.ViolationInfo violationInfo = AdminReportResponse.ViolationInfo.builder()
        .type(report.getReportType() != null ? report.getReportType().getCode() : "OTHER")
        .label(report.getReportType() != null ? report.getReportType().getName() : "Khác")
        .description(report.getDescription() != null ? report.getDescription() : "")
        .build();

    return AdminReportResponse.builder()
        .id(report.getId())
        .reporter(reporterInfo)
        .target(targetInfo)
        .violation(violationInfo)
        .status(report.getStatus().name())
        .createdAt(report.getReportedAt().format(DateTimeFormatter.ISO_DATE))
        .build();
  }

  private AdminReportResponse.TargetInfo buildTargetInfo(Report report) {
    String type = "OTHER";
    String title = "";
    String subtitle = "";
    String contentPreview = "";

    if (report.getTargetPost() != null) {
      type = "POST";
      Post post = report.getTargetPost();
      title = "Bài viết #" + post.getId();
      subtitle = "Đăng bởi: " + (post.getUser().getFirstName() != null ? post.getUser().getFirstName() : "User");
      contentPreview = post.getContent() != null
          ? post.getContent().substring(0, Math.min(100, post.getContent().length()))
          : "";
    } else if (report.getTargetComment() != null) {
      type = "COMMENT";
      title = "Bình luận #" + report.getTargetComment().getId();
      contentPreview = report.getTargetComment().getContent();
    } else if (report.getTargetUser() != null) {
      type = "USER";
      User targetUser = report.getTargetUser();
      title = (targetUser.getFirstName() != null ? targetUser.getFirstName() : "") +
          " " + (targetUser.getLastName() != null ? targetUser.getLastName() : "");
      subtitle = "ID: " + targetUser.getId();
    } else if (report.getTargetConversation() != null) {
      type = "PLACE";
      title = "Nhóm chat #" + report.getTargetConversation().getId();
    }

    return AdminReportResponse.TargetInfo.builder()
        .type(type)
        .title(title)
        .subtitle(subtitle)
        .contentPreview(contentPreview)
        .build();
  }

  private String formatRelativeTime(LocalDateTime time) {
    if (time == null)
      return "";

    long minutes = java.time.Duration.between(time, LocalDateTime.now()).toMinutes();
    if (minutes < 60)
      return minutes + " phút trước";

    long hours = minutes / 60;
    if (hours < 24)
      return hours + " giờ trước";

    long days = hours / 24;
    return days + " ngày trước";
  }

  // ==================== REPORT TYPES ====================

  public List<ReportTypeResponse> getReportTypes(String search) {
    List<com.example.vnuguideapp.entity.ReportAndSystemSetting.ReportType> types;
    if (search != null && !search.isEmpty()) {
      types = reportTypeRepository.findByNameContainingIgnoreCase(search);
    } else {
      types = reportTypeRepository.findAll();
    }

    return types.stream()
        .map(this::mapToReportTypeResponse)
        .collect(Collectors.toList());
  }

  @Transactional
  public ReportTypeResponse createReportType(com.example.vnuguideapp.dto.request.ReportTypeRequest request) {
    if (reportTypeRepository.existsByCode(request.getCode())) {
      throw new RuntimeException("ReportType with code '" + request.getCode() + "' already exists");
    }

    com.example.vnuguideapp.entity.ReportAndSystemSetting.ReportType reportType = com.example.vnuguideapp.entity.ReportAndSystemSetting.ReportType
        .builder()
        .code(request.getCode())
        .name(request.getName())
        .description(request.getDescription())
        .build();

    reportType = reportTypeRepository.save(reportType);
    return mapToReportTypeResponse(reportType);
  }

  @Transactional
  public ReportTypeResponse updateReportType(Long id, com.example.vnuguideapp.dto.request.ReportTypeRequest request) {
    com.example.vnuguideapp.entity.ReportAndSystemSetting.ReportType reportType = reportTypeRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("ReportType not found"));

    reportType.setName(request.getName());
    reportType.setDescription(request.getDescription());

    reportType = reportTypeRepository.save(reportType);
    return mapToReportTypeResponse(reportType);
  }

  @Transactional
  public void deleteReportType(Long id) {
    reportTypeRepository.deleteById(id);
  }

  private ReportTypeResponse mapToReportTypeResponse(
      com.example.vnuguideapp.entity.ReportAndSystemSetting.ReportType type) {
    return ReportTypeResponse.builder()
        .id(type.getId())
        .code(type.getCode())
        .name(type.getName())
        .description(type.getDescription())
        .build();
  }

  // ==================== POSTS ====================

  public PageResponse<AdminPostResponse> getPosts(int page, int size, String search, String status) {
    final com.example.vnuguideapp.enums.Visibility visibilityEnum = parseVisibility(status);
    final String finalSearch = search;

    Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
    Page<Post> postPage = postRepository.findAll(pageable);

    List<AdminPostResponse> posts = postPage.getContent().stream()
        .filter(post -> visibilityEnum == null || post.getVisibility() == visibilityEnum)
        .filter(post -> finalSearch == null || finalSearch.isEmpty() ||
            (post.getContent() != null && post.getContent().toLowerCase().contains(finalSearch.toLowerCase())))
        .map(this::mapToAdminPostResponse)
        .collect(Collectors.toList());

    return PageResponse.<AdminPostResponse>builder()
        .data(posts)
        .total(postPage.getTotalElements())
        .page(page)
        .size(size)
        .build();
  }

  private com.example.vnuguideapp.enums.Visibility parseVisibility(String status) {
    if (status != null && !status.isEmpty()) {
      try {
        return com.example.vnuguideapp.enums.Visibility.valueOf(status.toUpperCase());
      } catch (IllegalArgumentException ignored) {
      }
    }
    return null;
  }

  @Transactional
  public void hidePost(Long id) {
    Post post = postRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("Post not found"));

    post.setVisibility(com.example.vnuguideapp.enums.Visibility.HIDDEN);
    postRepository.save(post);

    // Send notification to post owner
    if (post.getUser() != null) {
      notificationService.createNotification(
          post.getUser(),
          null,
          NotificationType.POST_REMOVED,
          "Bài viết của bạn đã bị ẩn",
          "Bài viết của bạn đã bị ẩn bởi quản trị viên do vi phạm quy định cộng đồng.",
          post.getId(),
          null,
          null,
          null);
    }
  }

  @Transactional
  public void deletePost(Long id) {
    Post post = postRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("Post not found"));

    // Send notification before deletion
    if (post.getUser() != null) {
      notificationService.createNotification(
          post.getUser(),
          null,
          NotificationType.POST_REMOVED,
          "Bài viết của bạn đã bị xóa",
          "Bài viết của bạn đã bị xóa bởi quản trị viên do vi phạm nghiêm trọng quy định cộng đồng.",
          null,
          null,
          null,
          null);
    }

    postRepository.deleteById(id);
  }

  private AdminPostResponse mapToAdminPostResponse(Post post) {
    User author = post.getUser();
    String authorName = ((author.getFirstName() != null ? author.getFirstName() : "") +
        " " + (author.getLastName() != null ? author.getLastName() : "")).trim();

    String authorAvatar = "https://ui-avatars.com/api/?name=" +
        (author.getFirstName() != null ? author.getFirstName() : "U") + "&background=random";

    Optional<UserProfile> profileOpt = userProfileRepository.findByUserId(author.getId());
    if (profileOpt.isPresent() && profileOpt.get().getAvatarUrl() != null) {
      authorAvatar = profileOpt.get().getAvatarUrl();
    }

    String contentPreview = post.getContent() != null
        ? post.getContent().substring(0, Math.min(150, post.getContent().length()))
        : "";

    return AdminPostResponse.builder()
        .id(String.valueOf(post.getId()))
        .author(AdminPostResponse.AuthorInfo.builder()
            .name(authorName)
            .avatar(authorAvatar)
            .email(author.getEmail())
            .build())
        .content(post.getContent())
        .contentPreview(contentPreview)
        .visibility(post.getVisibility() != null ? post.getVisibility().name() : "PUBLIC")
        .createdAt(post.getCreatedAt() != null ? post.getCreatedAt().format(DateTimeFormatter.ISO_DATE_TIME) : "")
        .stats(AdminPostResponse.StatsInfo.builder()
            .reactions(post.getReactionCount() != null ? post.getReactionCount() : 0)
            .comments(post.getCommentCount() != null ? post.getCommentCount() : 0)
            .shares(0) // Add if you have shares tracking
            .build())
        .images(new String[0]) // Add image URLs if needed
        .build();
  }
}
