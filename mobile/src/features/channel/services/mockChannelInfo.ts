/**
 * Mock Channel Info Service
 * Provides mock data for channel info screens
 */

import type { ChannelInfo } from '@/shared/types';

/**
 * Mock channel data matching Figma design
 */
export const MOCK_CHANNEL_INFO: Record<string, ChannelInfo> = {
    'coffee-homestay': {
        id: 'coffee-homestay',
        name: 'Cà Phê Homestay',
        emoji: '🏡',
        description:
            'Khám phá những quán cafe phong cách homestay, ấm cúng và vintage ở làng đại học. Nơi chia sẻ địa điểm, review và tổ chức meetup cho các bạn yêu thích không gian cà phê đặc biệt.',
        memberCount: 435,
        previewImageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=300&h=200&fit=crop',
        creator: {
            id: 'user-linh-chi',
            displayName: 'Linh Chi',
        },
        members: [
            {
                id: 'user-1',
                displayName: 'Nguyễn Minh Anh',
                avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
            },
            {
                id: 'user-2',
                displayName: 'Trần Văn Hùng',
                avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
            },
            {
                id: 'user-3',
                displayName: 'Lê Thị Mai',
                avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
            },
            {
                id: 'user-4',
                displayName: 'Phạm Quốc Bảo',
                avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
            },
            {
                id: 'user-5',
                displayName: 'Hoàng Thùy Dung',
                avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
            },
        ],
        isJoined: false,
    },
    'dalat-travel': {
        id: 'dalat-travel',
        name: 'Du lịch Đà Lạt 2024',
        emoji: '🏔️',
        description:
            'Nhóm dành cho các bạn yêu thích du lịch Đà Lạt. Chia sẻ kinh nghiệm, địa điểm check-in, quán ăn ngon và lập kế hoạch đi chung.',
        memberCount: 856,
        previewImageUrl: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=300&h=200&fit=crop',
        creator: {
            id: 'user-minh-tuan',
            displayName: 'Minh Tuấn',
        },
        members: [
            {
                id: 'user-6',
                displayName: 'Nguyễn Văn An',
                avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
            },
            {
                id: 'user-7',
                displayName: 'Trần Thị Bình',
                avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
            },
            {
                id: 'user-8',
                displayName: 'Lê Hoàng Cường',
                avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face',
            },
            {
                id: 'user-9',
                displayName: 'Phạm Thị Duyên',
                avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face',
            },
            {
                id: 'user-10',
                displayName: 'Hoàng Minh Em',
                avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop&crop=face',
            },
        ],
        isJoined: false,
    },
};

/**
 * Simulated API delay
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Mock API service for channel info
 */
export const channelInfoService = {
    getChannelInfo: async (channelId: string): Promise<ChannelInfo | null> => {
        await delay(300);
        return MOCK_CHANNEL_INFO[channelId] || null;
    },

    joinChannel: async (channelId: string): Promise<{ success: boolean; channelId: string }> => {
        await delay(500);
        // Update the mock data to reflect joined status
        if (MOCK_CHANNEL_INFO[channelId]) {
            MOCK_CHANNEL_INFO[channelId].isJoined = true;
        }
        return { success: true, channelId };
    },

    leaveChannel: async (channelId: string): Promise<{ success: boolean; channelId: string }> => {
        await delay(500);
        if (MOCK_CHANNEL_INFO[channelId]) {
            MOCK_CHANNEL_INFO[channelId].isJoined = false;
        }
        return { success: true, channelId };
    },
};
