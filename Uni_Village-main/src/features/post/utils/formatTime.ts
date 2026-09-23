/**
 * Time formatting utilities for Post feature
 */

/**
 * Format a date to relative time (e.g., "2 giờ trước")
 */
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) {
    return `${years} năm trước`;
  }
  if (months > 0) {
    return `${months} tháng trước`;
  }
  if (weeks > 0) {
    return `${weeks} tuần trước`;
  }
  if (days > 0) {
    return `${days} ngày trước`;
  }
  if (hours > 0) {
    return `${hours} giờ trước`;
  }
  if (minutes > 0) {
    return `${minutes} phút trước`;
  }
  return 'Vừa xong';
}
