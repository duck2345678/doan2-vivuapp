import { Colors, Spacing } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import { MaterialIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

interface AudioPlayerProps {
    uri: string;
    duration?: number;
}

export function AudioPlayer({ uri, duration }: AudioPlayerProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [position, setPosition] = useState(0);
    const [totalDuration, setTotalDuration] = useState(duration || 0);

    useEffect(() => {
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [sound]);

    const handlePlayPause = async () => {
        try {
            if (!sound) {
                setIsLoading(true);
                const { sound: newSound } = await Audio.Sound.createAsync(
                    { uri },
                    { shouldPlay: true },
                    onPlaybackStatusUpdate
                );
                setSound(newSound);
                setIsPlaying(true);
                setIsLoading(false);
            } else {
                if (isPlaying) {
                    await sound.pauseAsync();
                    setIsPlaying(false);
                } else {
                    await sound.playAsync();
                    setIsPlaying(true);
                }
            }
        } catch (error) {
            console.error('Error playing audio:', error);
            setIsLoading(false);
        }
    };

    const onPlaybackStatusUpdate = (status: any) => {
        if (status.isLoaded) {
            setPosition(status.positionMillis);
            setTotalDuration(status.durationMillis || 0);
            setIsPlaying(status.isPlaying);

            if (status.didJustFinish) {
                setIsPlaying(false);
                setPosition(0);
            }
        }
    };

    const formatTime = (millis: number) => {
        const totalSeconds = Math.floor(millis / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.chipBackground }]}>
            <Pressable
                onPress={handlePlayPause}
                disabled={isLoading}
                style={[styles.playButton, { backgroundColor: colors.actionBlue }]}
            >
                {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <MaterialIcons
                        name={isPlaying ? 'pause' : 'play-arrow'}
                        size={24}
                        color="#fff"
                    />
                )}
            </Pressable>

            <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                    <View
                        style={[
                            styles.progressFill,
                            {
                                backgroundColor: colors.actionBlue,
                                width: totalDuration ? `${(position / totalDuration) * 100}%` : '0%',
                            },
                        ]}
                    />
                </View>
                <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                    {formatTime(position)} / {formatTime(totalDuration)}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.sm,
        borderRadius: 12,
        gap: Spacing.sm,
        minWidth: 200,
    },
    playButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressContainer: {
        flex: 1,
        gap: 4,
    },
    progressBar: {
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
    timeText: {
        fontSize: 12,
    },
});
