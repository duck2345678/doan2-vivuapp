package com.example.vnuguideapp.exception;

import lombok.Getter;

@Getter
// Đặt trong package com.yourproject.exception

/**
 * Class Exception cha cho tất cả các lỗi nghiệp vụ (business exceptions).
 * * Kế thừa từ RuntimeException để nó là một "unchecked exception".
 * Spring sẽ tự động rollback transaction khi gặp RuntimeException.
 */
public abstract class BaseException extends RuntimeException {

    // Một mã lỗi duy nhất, không đổi để phía client có thể dựa vào
    private final String errorCode;

    // Constructor chính
    public BaseException(String message, String errorCode) {
        super(message); // Truyền message lên cho class cha (RuntimeException)
        this.errorCode = errorCode;
    }

    // Constructor nếu bạn muốn bọc (wrap) một exception khác
    public BaseException(String message, String errorCode, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }

}

