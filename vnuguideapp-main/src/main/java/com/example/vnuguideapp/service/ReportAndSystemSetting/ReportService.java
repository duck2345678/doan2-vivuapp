package com.example.vnuguideapp.service.ReportAndSystemSetting;

import com.example.vnuguideapp.dto.reponse.ReportAndSystemSetting.ReportResponse;
import com.example.vnuguideapp.dto.request.ReportAndSystemSetting.CreateReportRequest;
import com.example.vnuguideapp.entity.AccountAndAuthorization.User;
import com.example.vnuguideapp.entity.ChatAndActivity.Conversation;
import com.example.vnuguideapp.entity.PostAndInteractions.Comment;
import com.example.vnuguideapp.entity.PostAndInteractions.Post;
import com.example.vnuguideapp.entity.ReportAndSystemSetting.Report;
import com.example.vnuguideapp.entity.ReportAndSystemSetting.ReportType;
import com.example.vnuguideapp.enums.ReportStatus;
import com.example.vnuguideapp.exception.exceptionImpl.DuplicateReportException;
import com.example.vnuguideapp.exception.exceptionImpl.InvalidReportTargetException;
import com.example.vnuguideapp.exception.exceptionImpl.ResourceNotFoundException;
import com.example.vnuguideapp.exception.exceptionImpl.SelfReportException;
import com.example.vnuguideapp.repository.AccountAndAuthorization.UserRepository;
import com.example.vnuguideapp.repository.ChatAndActivity.ConversationRepository;
import com.example.vnuguideapp.repository.PostAndInteractions.CommentRepository;
import com.example.vnuguideapp.repository.PostAndInteractions.PostRepository;
import com.example.vnuguideapp.repository.ReportAndSystemSetting.ReportRepository;
import com.example.vnuguideapp.repository.ReportAndSystemSetting.ReportTypeRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ReportService {

    ReportRepository reportRepository;
    ReportTypeRepository reportTypeRepository;
    PostRepository postRepository;
    CommentRepository commentRepository;
    UserRepository userRepository;
    ConversationRepository conversationRepository;

    @Transactional
    public ReportResponse createReport(User reporter, CreateReportRequest request) {
        // Validate that exactly one target is provided
        if (!hasExactlyOneTarget(request)) {
            throw new InvalidReportTargetException();
        }

        // Get report type
        ReportType reportType = reportTypeRepository.findById(request.getReportTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("ReportType", request.getReportTypeId()));

        // Build report entity
        Report report = Report.builder()
                .reporter(reporter)
                .reportType(reportType)
                .description(request.getDescription())
                .status(ReportStatus.PENDING)
                .build();

        // Set target and validate
        if (request.getTargetPostId() != null) {
            Post targetPost = postRepository.findById(request.getTargetPostId())
                    .orElseThrow(() -> new ResourceNotFoundException("Post", request.getTargetPostId()));

            // Check for duplicate report
            if (reportRepository.existsByReporterAndTargetPost(reporter, targetPost)) {
                throw new DuplicateReportException("post");
            }
            report.setTargetPost(targetPost);
        }

        if (request.getTargetCommentId() != null) {
            Comment targetComment = commentRepository.findById(request.getTargetCommentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Comment", request.getTargetCommentId()));

            if (reportRepository.existsByReporterAndTargetComment(reporter, targetComment)) {
                throw new DuplicateReportException("comment");
            }
            report.setTargetComment(targetComment);
        }

        if (request.getTargetUserId() != null) {
            User targetUser = userRepository.findById(request.getTargetUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", request.getTargetUserId()));

            // Prevent self-reporting
            if (targetUser.getId().equals(reporter.getId())) {
                throw new SelfReportException();
            }

            if (reportRepository.existsByReporterAndTargetUser(reporter, targetUser)) {
                throw new DuplicateReportException("user");
            }
            report.setTargetUser(targetUser);
        }

        if (request.getTargetConversationId() != null) {
            Conversation targetConversation = conversationRepository.findById(request.getTargetConversationId())
                    .orElseThrow(
                            () -> new ResourceNotFoundException("Conversation", request.getTargetConversationId()));

            if (reportRepository.existsByReporterAndTargetConversation(reporter, targetConversation)) {
                throw new DuplicateReportException("conversation");
            }
            report.setTargetConversation(targetConversation);
        }

        Report savedReport = reportRepository.save(report);
        return mapToResponse(savedReport);
    }

    private boolean hasExactlyOneTarget(CreateReportRequest request) {
        int count = 0;
        if (request.getTargetPostId() != null)
            count++;
        if (request.getTargetCommentId() != null)
            count++;
        if (request.getTargetUserId() != null)
            count++;
        if (request.getTargetConversationId() != null)
            count++;
        return count == 1;
    }

    private ReportResponse mapToResponse(Report report) {
        return ReportResponse.builder()
                .id(report.getId())
                .reporterId(report.getReporter().getId())
                .reporterUsername(report.getReporter().getUsername())
                .reportTypeId(report.getReportType().getId())
                .reportTypeCode(report.getReportType().getCode())
                .reportTypeName(report.getReportType().getName())
                .targetPostId(report.getTargetPost() != null ? report.getTargetPost().getId() : null)
                .targetCommentId(report.getTargetComment() != null ? report.getTargetComment().getId() : null)
                .targetUserId(report.getTargetUser() != null ? report.getTargetUser().getId() : null)
                .targetConversationId(
                        report.getTargetConversation() != null ? report.getTargetConversation().getId() : null)
                .description(report.getDescription())
                .status(report.getStatus())
                .reportedAt(report.getReportedAt())
                .build();
    }
}
