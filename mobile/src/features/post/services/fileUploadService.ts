import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

/**
 * PickedFile - Type for files selected by the user
 * Compatible with MediaPreviewGrid's PreviewFile and lib/api's FileUpload
 */
export interface PickedFile {
    id: string;
    uri: string;
    name: string;
    type: string;
    width?: number;
    height?: number;
}

/**
 * Request permission to access the media library
 */
async function requestMediaLibraryPermission(): Promise<boolean> {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert(
            'Cần quyền truy cập',
            'Vui lòng cho phép ứng dụng truy cập thư viện ảnh để chọn ảnh.',
            [{ text: 'OK' }]
        );
        return false;
    }
    return true;
}

/**
 * Request permission to access the camera
 */
async function requestCameraPermission(): Promise<boolean> {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert(
            'Cần quyền truy cập',
            'Vui lòng cho phép ứng dụng truy cập camera.',
            [{ text: 'OK' }]
        );
        return false;
    }
    return true;
}

/**
 * Generate a unique ID for picked files
 */
function generateFileId(): string {
    return `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Extract file name from URI
 */
function getFileNameFromUri(uri: string): string {
    const uriParts = uri.split('/');
    return uriParts[uriParts.length - 1] || `image-${Date.now()}.jpg`;
}

/**
 * Convert ImagePicker asset to PickedFile
 */
function convertAssetToPickedFile(asset: ImagePicker.ImagePickerAsset): PickedFile {
    const fileName = asset.fileName || getFileNameFromUri(asset.uri);
    const mimeType = asset.mimeType || 'image/jpeg';

    return {
        id: generateFileId(),
        uri: asset.uri,
        name: fileName,
        type: mimeType,
        width: asset.width,
        height: asset.height,
    };
}

/**
 * Pick multiple images from the gallery
 * @param allowMultiple - Whether to allow selecting multiple images
 * @returns Array of PickedFile objects
 */
async function pickImages(allowMultiple = true): Promise<PickedFile[]> {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) {
        return [];
    }

    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: allowMultiple,
        quality: 0.8,
        exif: false,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
        return [];
    }

    return result.assets.map(convertAssetToPickedFile);
}

/**
 * Pick a single image from the gallery
 * @returns A single PickedFile or null if cancelled
 */
async function pickSingleImage(): Promise<PickedFile | null> {
    const files = await pickImages(false);
    return files.length > 0 ? files[0] : null;
}

/**
 * Take a photo using the camera
 * @returns A PickedFile or null if cancelled
 */
async function pickImageFromCamera(): Promise<PickedFile | null> {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
        return null;
    }

    const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        exif: false,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
    }

    return convertAssetToPickedFile(result.assets[0]);
}

/**
 * Show image picker options (Camera or Gallery)
 * @param allowMultiple - Whether to allow selecting multiple images from gallery
 * @returns Array of PickedFile objects
 */
function showImagePickerOptions(allowMultiple = true): Promise<PickedFile[]> {
    return new Promise((resolve) => {
        Alert.alert(
            'Chọn ảnh',
            'Bạn muốn lấy ảnh từ đâu?',
            [
                {
                    text: 'Chụp ảnh',
                    onPress: async () => {
                        const photo = await pickImageFromCamera();
                        resolve(photo ? [photo] : []);
                    },
                },
                {
                    text: 'Thư viện ảnh',
                    onPress: async () => {
                        const images = await pickImages(allowMultiple);
                        resolve(images);
                    },
                },
                {
                    text: 'Hủy',
                    style: 'cancel',
                    onPress: () => resolve([]),
                },
            ]
        );
    });
}

export const fileUploadService = {
    pickImages,
    pickSingleImage,
    pickImageFromCamera,
    showImagePickerOptions,
};
