package com.example.vivuapp.service.ReportAndSystemSetting;

import com.example.vivuapp.dto.reponse.ReportAndSystemSetting.ReportResponse;
import com.example.vivuapp.dto.request.ReportAndSystemSetting.CreateReportRequest;
import com.example.vivuapp.entity.AccountAndAuthorization.User;
import com.example.vivuapp.entity.ChatAndActivity.Conversation;
import com.example.vivuapp.entity.PostAndInteractions.Comment;
import com.example.vivuapp.entity.PostAndInteractions.Post;
import com.example.vivuapp.entity.ReportAndSystemSetting.Report;
import com.example.vivuapp.entity.ReportAndSystemSetting.ReportType;
import com.example.vivuapp.enums.ReportStatus;
import com.example.vivuapp.exception.exceptionImpl.DuplicateReportException;
import com.example.vivuapp.exception.exceptionImpl.InvalidReportTargetException;
import com.example.vivuapp.exception.exceptionImpl.ResourceNotFoundException;
import com.example.vivuapp.exception.exceptionImpl.SelfReportException;
import com.example.vivuapp.repository.AccountAndAuthorization.UserRepository;
import com.example.vivuapp.repository.ChatAndActivity.ConversationRepository;
import com.example.vivuapp.repository.PostAndInteractions.CommentRepository;
import com.example.vivuapp.repository.PostAndInteractions.PostRepository;
import com.example.vivuapp.repository.ReportAndSystemSetting.ReportRepository;
import com.example.vivuapp.repository.ReportAndSystemSetting.ReportTypeRepository;
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
