/**
 * Media Service
 * Provides sent media data using the real backend API
 */
import type { MediaAttachmentResponse } from '@/shared/types/backend.types';
import { conversationsApi } from '../api';
import type { MediaItem, SentMediaResponse } from '../types';

/**
 * Map MediaAttachmentResponse to MediaItem type
 */
function mapMediaToItem(media: MediaAttachmentResponse, index: number): MediaItem {
    return {
        id: media.id?.toString() || `media-${index}`,
        url: media.fileUrl || '',
        type: media.fileType === 'VIDEO' ? 'video' : 'image',
        width: 400, // Default dimensions, actual may vary
        height: 400,
        sentAt: media.uploadedAt || new Date().toISOString(),
    };
}

/**
 * Fetch all sent media for a conversation from API
 * @param conversationId - Conversation identifier
 */
async function getAllMedia(conversationId: string): Promise<MediaItem[]> {
    try {
        const response = await conversationsApi.getConversationMedia(conversationId);
        const mediaList = response.result || [];

        return mediaList.map((media, index) => mapMediaToItem(media, index));
    } catch (error) {
        console.error('[Media Service] Error fetching media:', error);
        return [];
    }
}

/**
 * Fetch sent media preview (first 6 items)
 * @param conversationId - Conversation identifier
 */
export async function fetchSentMediaPreview(conversationId: string): Promise<MediaItem[]> {
    const allMedia = await getAllMedia(conversationId);
    return allMedia.slice(0, 6);
}

/**
 * Fetch sent media with pagination
 * @param conversationId - Conversation identifier
 * @param page - Page number (1-indexed)
 * @param limit - Items per page
 */
export async function fetchSentMedia(
    conversationId: string,
    page: number = 1,
    limit: number = 20
): Promise<SentMediaResponse> {
    const allMedia = await getAllMedia(conversationId);

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedMedia = allMedia.slice(startIndex, endIndex);

    return {
        data: paginatedMedia,
        pagination: {
            page,
            limit,
            total: allMedia.length,
            hasMore: endIndex < allMedia.length,
        },
    };
}
