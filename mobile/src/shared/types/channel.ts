/**
 * Channel types for invite cards and channel info
 */

/**
 * Channel category enum
 */
export type ChannelCategory = 'TRAVEL' | 'COURSE' | 'FOOD' | 'PHOTOGRAPHY' | 'READING' | 'OTHER';

/**
 * Channel invite data for embedding in posts
 */
export interface ChannelInvite {
    channelId: string;
    name: string;
    emoji?: string;
    description: string;
    memberCount: number;
    iconUrl?: string;
}

/**
 * Channel member for avatar display
 */
export interface ChannelMember {
    id: string;
    displayName: string;
    avatarUrl?: string;
}

/**
 * Full channel info for the info screen
 */
export interface ChannelInfo {
    id: string;
    channelId?: number; // Numeric channel ID for API calls
    name: string;
    emoji?: string;
    description: string;
    memberCount: number;
    iconUrl?: string;
    previewImageUrl?: string;
    category?: ChannelCategory;
    inviteCode?: string;
    allowSharing?: boolean;
    isAdmin?: boolean; // Whether current user is admin
    creator: {
        id: string;
        displayName: string;
    };
    members: ChannelMember[];
    isJoined: boolean;
}
