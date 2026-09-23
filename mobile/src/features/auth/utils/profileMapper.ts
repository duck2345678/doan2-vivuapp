import type { Profile } from '@/features/profile/types';
import type { User } from '../types';

export function mapProfileToUser(profile: Profile): User {
    return {
        id: profile.userId,
        userId: profile.userId,
        username: profile.username,
        displayName: profile.displayName,
        email: '',
        avatarUrl: profile.avatarUrl,
        bio: profile.bio,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
    };
}
