import { Colors } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';
import { MaterialIcons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

interface VideoPlayerProps {
    uri: string;
    width?: number;
    height?: number;
}

export function VideoPlayer({ uri, width = 300, height = 200 }: VideoPlayerProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];
    const videoRef = useRef<Video>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const handlePlayPause = async () => {
        if (!videoRef.current) return;

        try {
            if (isPlaying) {
                await videoRef.current.pauseAsync();
            } else {
                await videoRef.current.playAsync();
            }
            setIsPlaying(!isPlaying);
        } catch (error) {
            console.error('Error playing video:', error);
        }
    };

    return (
        <View style={[styles.container, { width, height }]}>
            <Video
                ref={videoRef}
                source={{ uri }}
                style={[styles.video, { width, height }]}
                resizeMode={ResizeMode.CONTAIN}
                useNativeControls={false}
                onLoad={() => setIsLoading(false)}
                onPlaybackStatusUpdate={(status: any) => {
                    if (status.isLoaded) {
                        setIsPlaying(status.isPlaying);
                    }
                }}
            />

            {isLoading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={colors.actionBlue} />
                </View>
            )}

            {!isLoading && (
                <Pressable
                    style={styles.playOverlay}
                    onPress={handlePlayPause}
                >
                    {!isPlaying && (
                        <View style={[styles.playButton, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                            <MaterialIcons name="play-arrow" size={48} color="#fff" />
                        </View>
                    )}
                </Pressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    video: {
        borderRadius: 12,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    playButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
