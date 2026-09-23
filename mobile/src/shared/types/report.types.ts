/**
 * Report Types
 *
 * Types and interfaces for the Report API system.
 * Matches backend ReportController, ReportService, and DTOs.
 */

/**
 * Report status enum
 * Represents the current state of a report
 */
export enum ReportStatus {
  PENDING = "PENDING",
  REJECTED = "REJECTED",
  RESOLVED = "RESOLVED",
}

/**
 * Report target type
 * Defines what type of entity is being reported
 */
export enum ReportTargetType {
  POST = "POST",
  COMMENT = "COMMENT",
  USER = "USER",
  CONVERSATION = "CONVERSATION",
}

/**
 * Report reason enum
 * Common report reasons for better UX
 * These map to reportTypeId in backend (1-5)
 */
export enum ReportReason {
  SPAM = "SPAM",
  INAPPROPRIATE = "INAPPROPRIATE",
  HARASSMENT = "HARASSMENT",
  FALSE_INFORMATION = "FALSE_INFORMATION",
  OTHER = "OTHER",
}

/**
 * Map ReportReason to reportTypeId
 * Backend expects reportTypeId (1-5) instead of reason string
 */
export const REPORT_REASON_TO_TYPE_ID: Record<ReportReason, number> = {
  [ReportReason.SPAM]: 1,
  [ReportReason.INAPPROPRIATE]: 2,
  [ReportReason.HARASSMENT]: 3,
  [ReportReason.FALSE_INFORMATION]: 4,
  [ReportReason.OTHER]: 5,
};

/**
 * Create Report Request
 * Data required to create a new report
 * Matches backend CreateReportRequest.java structure
 */
export interface CreateReportRequest {
  reportTypeId: number;
  targetPostId?: number;
  targetCommentId?: number;
  targetUserId?: number;
  targetConversationId?: string;
  description?: string;
}

/**
 * Report Response
 * Complete report information returned from the backend
 * Matches backend ReportResponse.java structure
 */
export interface ReportResponse {
  id: number;
  reporterId: number;
  reporterUsername: string;
  reportTypeId: number;
  reportTypeCode: string;
  reportTypeName: string;
  targetPostId?: number;
  targetCommentId?: number;
  targetUserId?: number;
  targetConversationId?: string;
  description?: string;
  status: ReportStatus;
  reportedAt: string;
}

/**
 * Report helper type - reason with label for UI display
 */
export interface ReportReasonOption {
  value: ReportReason;
  label: string;
  description?: string;
}

/**
 * Predefined report reason options
 */
export const REPORT_REASON_OPTIONS: ReportReasonOption[] = [
  {
    value: ReportReason.SPAM,
    label: "Spam",
    description: "Nội dung spam hoặc quảng cáo không mong muốn",
  },
  {
    value: ReportReason.INAPPROPRIATE,
    label: "Nội dung không phù hợp",
    description: "Nội dung không phù hợp với cộng đồng",
  },
  {
    value: ReportReason.HARASSMENT,
    label: "Quấy rối",
    description: "Quấy rối hoặc bắt nạt người khác",
  },
  {
    value: ReportReason.FALSE_INFORMATION,
    label: "Thông tin sai lệch",
    description: "Thông tin giả mạo hoặc sai sự thật",
  },
  {
    value: ReportReason.OTHER,
    label: "Khác",
    description: "Lý do khác",
  },
];
