import { Avatar, Button } from '@/shared/components/ui';
import { Colors } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import { formatCompact } from '@/shared/utils';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import type { Profile } from '../types';

interface ProfileHeaderProps {
    profile: Profile;
    isOwnProfile?: boolean;
    onEditPress?: () => void;
    onFollowPress?: () => void;
}

export function ProfileHeader({
    profile,
    isOwnProfile = false,
    onEditPress,
    onFollowPress,
}: ProfileHeaderProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Cover Image */}
            {profile.coverUrl ? (
                <Image
                    source={{ uri: profile.coverUrl }}
                    style={styles.cover}
                    contentFit="cover"
                />
            ) : (
                <View style={[styles.coverPlaceholder, { backgroundColor: colors.muted }]} />
            )}

            {/* Avatar */}
            <View style={styles.avatarContainer}>
                <Avatar
                    source={profile.avatarUrl}
                    name={profile.displayName}
                    size="xl"
                    style={[styles.avatar, { borderColor: colors.background }]}
                />
            </View>

            {/* Info */}
            <View style={styles.info}>
                <Text style={[styles.displayName, { color: colors.textPrimary }]}>{profile.displayName}</Text>
                <Text style={[styles.username, { color: colors.icon }]}>@{profile.username}</Text>

                {profile.bio && <Text style={[styles.bio, { color: colors.textPrimary }]}>{profile.bio}</Text>}

                {/* Stats */}
                <View style={styles.stats}>
                    <View style={styles.stat}>
                        <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formatCompact(profile.postsCount)}</Text>
                        <Text style={[styles.statLabel, { color: colors.icon }]}>Posts</Text>
                    </View>
                    <View style={styles.stat}>
                        <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formatCompact(profile.followersCount)}</Text>
                        <Text style={[styles.statLabel, { color: colors.icon }]}>Followers</Text>
                    </View>
                    <View style={styles.stat}>
                        <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formatCompact(profile.followingCount)}</Text>
                        <Text style={[styles.statLabel, { color: colors.icon }]}>Following</Text>
                    </View>
                </View>

                {/* Actions */}
                {isOwnProfile ? (
                    <Button
                        title="Edit Profile"
                        variant="outline"
                        size="sm"
                        onPress={onEditPress}
                    />
                ) : (
                    <Button
                        title={profile.isFollowing ? 'Following' : 'Follow'}
                        variant={profile.isFollowing ? 'outline' : 'primary'}
                        size="sm"
                        onPress={onFollowPress}
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        // Dynamic backgroundColor applied inline
    },
    cover: {
        height: 120,
        width: '100%',
    },
    coverPlaceholder: {
        height: 120,
    },
    avatarContainer: {
        marginTop: -40,
        paddingHorizontal: 16,
    },
    avatar: {
        borderWidth: 3,
    },
    info: {
        padding: 16,
        gap: 8,
    },
    displayName: {
        fontSize: 20,
        fontWeight: '700',
    },
    username: {
        fontSize: 14,
    },
    bio: {
        fontSize: 14,
        lineHeight: 20,
    },
    stats: {
        flexDirection: 'row',
        gap: 24,
        marginTop: 8,
        marginBottom: 16,
    },
    stat: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 12,
    },
});
