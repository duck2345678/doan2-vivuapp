package com.example.vivuapp.authentication;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Builder;

@Builder
public record RegisterRequest(
                @NotBlank(message = "Email không được để trống") @Email(message = "Email không hợp lệ") String email,
                @NotBlank(message = "Tên đăng nhập không được để trống") @Size(min = 3, max = 50, message = "Tên đăng nhập phải từ 3-50 ký tự") @Pattern(regexp = "^[a-zA-Z][a-zA-Z0-9_]*$", message = "Tên đăng nhập phải bắt đầu bằng chữ cái và chỉ chứa chữ cái, số, dấu gạch dưới") String username,
                @NotBlank(message = "Mật khẩu không được để trống") @Size(min = 8, message = "Mật khẩu phải có ít nhất 8 ký tự") String password) {

        /**
         * Lấy username làm firstName (vì không có fullname)
         */
        public String getFirstName() {
                return username != null ? username : "";
        }

        /**
         * Không có lastName khi không có fullname
         */
        public String getLastName() {
                return "";
        }

        /**
         * Lấy display name từ username
         */
        public String getDisplayName() {
                return username != null ? username : "";
        }
}
