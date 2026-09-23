/**
 * Report Service
 *
 * API service for creating and managing reports.
 * Handles reporting posts, comments, users, and conversations.
 */

import type {
  CreateReportRequest,
  ReportReason,
  ReportResponse,
} from "@/shared/types/report.types";
import { apiClient } from "./client";
import { API_ENDPOINTS } from "./endpoints";

/**
 * Create a new report
 *
 * @param request - Report creation data
 * @returns Promise with report response
 * @throws ApiError with specific error codes:
 *   - DUPLICATE_REPORT: User has already reported this target
 *   - SELF_REPORT: User cannot report themselves
 *   - INVALID_REPORT_TARGET: Target does not exist or is invalid
 */
export async function createReport(
  request: CreateReportRequest
): Promise<ReportResponse> {
  const response = await apiClient.post<ReportResponse>(
    API_ENDPOINTS.REPORTS.CREATE,
    request
  );

  // Backend returns ReportResponse directly without ApiResponse wrapper
  return response as any;
}

/**
 * Helper function to create a post report
 */
export async function reportPost(
  postId: number,
  reason: string
): Promise<ReportResponse> {
  // Import at runtime to avoid circular dependency
  const { REPORT_REASON_TO_TYPE_ID, ReportReason } =
    await import("@/shared/types/report.types");

  // Check if reason is a ReportReason enum or custom text
  const reportTypeId = Object.values(ReportReason).includes(
    reason as ReportReason
  )
    ? REPORT_REASON_TO_TYPE_ID[reason as ReportReason]
    : REPORT_REASON_TO_TYPE_ID[ReportReason.OTHER]; // Default to OTHER for custom reasons

  return createReport({
    reportTypeId,
    targetPostId: postId,
    description: reason,
  });
}

/**
 * Helper function to create a comment report
 */
export async function reportComment(
  commentId: number,
  reason: string
): Promise<ReportResponse> {
  const { REPORT_REASON_TO_TYPE_ID, ReportReason } =
    await import("@/shared/types/report.types");

  const reportTypeId = Object.values(ReportReason).includes(
    reason as ReportReason
  )
    ? REPORT_REASON_TO_TYPE_ID[reason as ReportReason]
    : REPORT_REASON_TO_TYPE_ID[ReportReason.OTHER];

  return createReport({
    reportTypeId,
    targetCommentId: commentId,
    description: reason,
  });
}

/**
 * Helper function to create a user report
 */
export async function reportUser(
  userId: number,
  reason: string
): Promise<ReportResponse> {
  const { REPORT_REASON_TO_TYPE_ID, ReportReason } =
    await import("@/shared/types/report.types");

  const reportTypeId = Object.values(ReportReason).includes(
    reason as ReportReason
  )
    ? REPORT_REASON_TO_TYPE_ID[reason as ReportReason]
    : REPORT_REASON_TO_TYPE_ID[ReportReason.OTHER];

  return createReport({
    reportTypeId,
    targetUserId: userId,
    description: reason,
  });
}

/**
 * Helper function to create a conversation report
 */
export async function reportConversation(
  conversationId: number,
  reason: string
): Promise<ReportResponse> {
  const { REPORT_REASON_TO_TYPE_ID, ReportReason } =
    await import("@/shared/types/report.types");

  const reportTypeId = Object.values(ReportReason).includes(
    reason as ReportReason
  )
    ? REPORT_REASON_TO_TYPE_ID[reason as ReportReason]
    : REPORT_REASON_TO_TYPE_ID[ReportReason.OTHER];

  return createReport({
    reportTypeId,
    targetConversationId: String(conversationId),
    description: reason,
  });
}
