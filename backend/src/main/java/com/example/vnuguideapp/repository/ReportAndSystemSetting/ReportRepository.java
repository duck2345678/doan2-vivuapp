package com.example.vnuguideapp.repository.ReportAndSystemSetting;

import com.example.vnuguideapp.entity.AccountAndAuthorization.User;
import com.example.vnuguideapp.entity.ChatAndActivity.Conversation;
import com.example.vnuguideapp.entity.PostAndInteractions.Comment;
import com.example.vnuguideapp.entity.PostAndInteractions.Post;
import com.example.vnuguideapp.entity.ReportAndSystemSetting.Report;
import com.example.vnuguideapp.enums.ReportStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {

    // Check if user already reported this target (prevent duplicate reports)
    boolean existsByReporterAndTargetPost(User reporter, Post targetPost);

    boolean existsByReporterAndTargetComment(User reporter, Comment targetComment);

    boolean existsByReporterAndTargetUser(User reporter, User targetUser);

    boolean existsByReporterAndTargetConversation(User reporter, Conversation targetConversation);

    // Admin dashboard stats
    long countByStatus(ReportStatus status);
}
