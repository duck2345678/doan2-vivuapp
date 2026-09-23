import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export interface ImagePickerResult {
    uri: string;
    width: number;
    height: number;
    type?: string;
}

export interface UseImagePickerOptions {
    aspect?: [number, number];
    quality?: number;
    allowsEditing?: boolean;
}

export function useImagePicker(options: UseImagePickerOptions = {}) {
    const { aspect = [1, 1], quality = 0.8, allowsEditing = true } = options;

    const requestPermission = async (): Promise<boolean> => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(
                'Cần quyền truy cập',
                'Vui lòng cho phép ứng dụng truy cập thư viện ảnh để chọn ảnh đại diện.',
                [{ text: 'OK' }]
            );
            return false;
        }
        return true;
    };

    const pickImageFromGallery = async (): Promise<ImagePickerResult | null> => {
        const hasPermission = await requestPermission();
        if (!hasPermission) return null;

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing,
            aspect,
            quality,
        });

        if (result.canceled || !result.assets?.[0]) {
            return null;
        }

        const asset = result.assets[0];
        return {
            uri: asset.uri,
            width: asset.width,
            height: asset.height,
            type: asset.mimeType,
        };
    };

    const pickImageFromCamera = async (): Promise<ImagePickerResult | null> => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(
                'Cần quyền truy cập',
                'Vui lòng cho phép ứng dụng truy cập camera.',
                [{ text: 'OK' }]
            );
            return null;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing,
            aspect,
            quality,
        });

        if (result.canceled || !result.assets?.[0]) {
            return null;
        }

        const asset = result.assets[0];
        return {
            uri: asset.uri,
            width: asset.width,
            height: asset.height,
            type: asset.mimeType,
        };
    };

    const showImagePickerOptions = (): Promise<ImagePickerResult | null> => {
        return new Promise((resolve) => {
            Alert.alert(
                'Chọn ảnh đại diện',
                'Bạn muốn lấy ảnh từ đâu?',
                [
                    {
                        text: 'Chụp ảnh',
                        onPress: async () => {
                            const result = await pickImageFromCamera();
                            resolve(result);
                        },
                    },
                    {
                        text: 'Thư viện ảnh',
                        onPress: async () => {
                            const result = await pickImageFromGallery();
                            resolve(result);
                        },
                    },
                    {
                        text: 'Hủy',
                        style: 'cancel',
                        onPress: () => resolve(null),
                    },
                ]
            );
        });
    };

    return {
        pickImageFromGallery,
        pickImageFromCamera,
        showImagePickerOptions,
    };
}
