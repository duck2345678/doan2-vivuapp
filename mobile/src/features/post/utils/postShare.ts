/**
 * Post Share Utility Functions
 * Handles building share URLs and sharing posts via native share sheet
 */

import { Share } from 'react-native';
import { PostResponse } from '../types';

const BASE_URL = 'https://univillage.com';

/**
 * Build post share URL
 */
export function buildPostShareUrl(postId: number | string): string {
    return `${BASE_URL}/p/${postId}`;
}

/**
 * Share post via native share sheet
 */
export async function sharePost(
    post: PostResponse,
    onError?: (error: Error) => void
): Promise<void> {
    try {
        if (!post.id) return;

        const url = buildPostShareUrl(post.id);
        const contentPreview = post.content ?
            (post.content.length > 100 ? post.content.substring(0, 100) + '...' : post.content)
            : 'Xem bài viết này trên UniVillage';

        await Share.share({
            message: `${contentPreview}\n${url}`,
            url: url,
            title: 'Chia sẻ bài viết',
        });
    } catch (error) {
        // User cancelled share - not an error
        if ((error as Error).message !== 'User did not share') {
            onError?.(error as Error);
        }
    }
}
