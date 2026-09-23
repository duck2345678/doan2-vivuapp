export interface FileUpload {
    uri: string;
    name: string;
    type: string;
}

export const createMultipartData = (
    data: Record<string, any>,
    files?: FileUpload[]
): FormData => {
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            if (typeof value === 'object' && !Array.isArray(value)) {
                formData.append(key, JSON.stringify(value));
            } else if (Array.isArray(value)) {
                formData.append(key, JSON.stringify(value));
            } else {
                formData.append(key, String(value));
            }
        }
    });

    if (files && files.length > 0) {
        files.forEach((file) => {
            formData.append('files', {
                uri: file.uri,
                name: file.name,
                type: file.type,
            } as any);
        });
    }

    return formData;
};

export const createMultipartDataWithSingleFile = (
    data: Record<string, any>,
    file?: FileUpload,
    fileFieldName = 'file'
): FormData => {
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            if (typeof value === 'object' && !Array.isArray(value)) {
                formData.append(key, JSON.stringify(value));
            } else if (Array.isArray(value)) {
                formData.append(key, JSON.stringify(value));
            } else {
                formData.append(key, String(value));
            }
        }
    });

    if (file) {
        formData.append(fileFieldName, {
            uri: file.uri,
            name: file.name,
            type: file.type,
        } as any);
    }

    return formData;
};
