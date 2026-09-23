package com.example.vivuapp.entity.ReportAndSystemSetting;

import com.example.vivuapp.entity.AccountAndAuthorization.User;
import com.example.vivuapp.entity.ChatAndActivity.Conversation;
import com.example.vivuapp.entity.PostAndInteractions.Comment;
import com.example.vivuapp.entity.PostAndInteractions.Post;
import com.example.vivuapp.enums.ReportAction;
import com.example.vivuapp.enums.ReportStatus;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "reports")
@EntityListeners(AuditingEntityListener.class)
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Người gửi report
    @ManyToOne(optional = false)
    @JoinColumn(name = "reporter_user_id")
    private User reporter;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ReportStatus status;

    // TARGETS - các đối tượng bị báo cáo
    @ManyToOne
    @JoinColumn(name = "target_user_id")
    private User targetUser;

    @ManyToOne
    @JoinColumn(name = "target_post_id")
    private Post targetPost;

    @ManyToOne
    @JoinColumn(name = "target_comment_id")
    private Comment targetComment;

    @ManyToOne
    @JoinColumn(name = "target_channel_id")
    private Conversation targetConversation;

    // Loại report
    @ManyToOne
    @JoinColumn(name = "report_type_id")
    private ReportType reportType;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private ReportAction resultAction;

    @Column(columnDefinition = "TEXT")
    private String internalNote;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime reportedAt;

    private LocalDateTime resolvedAt;

    @ManyToOne
    @JoinColumn(name = "resolved_by")
    private User resolvedBy;
}
