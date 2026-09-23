package com.example.vnuguideapp.exception.exceptionImpl;

import com.example.vnuguideapp.exception.BaseException;

public class ResourceNotFoundException extends BaseException {

    private static final String ERROR_CODE = "RESOURCE_NOT_FOUND";

    public ResourceNotFoundException(String message) {
        // Gọi constructor của cha (BaseException)
        super(message, ERROR_CODE);
    }

    // Bạn có thể thêm các constructor tiện ích khác
    // Ví dụ: Tạo tự động message từ tên tài nguyên và ID
    public ResourceNotFoundException(String resourceName, Object id) {
        super(String.format("%s không tìm thấy với ID '%s'", resourceName, id), ERROR_CODE);
    }
}
