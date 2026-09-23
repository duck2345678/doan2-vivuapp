package com.example.vivuapp.auditing;

import com.example.vivuapp.entity.AccountAndAuthorization.User;
import com.example.vivuapp.repository.AccountAndAuthorization.UserRepository;
import lombok.RequiredArgsConstructor; // Thêm lombok cho gọn
import org.springframework.data.domain.AuditorAware;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.util.Optional;

// Thêm RequiredArgsConstructor để tự inject UserRepository
@RequiredArgsConstructor
public class ApplicationAuditAware implements AuditorAware<Long> {

    private final UserRepository userRepository;

    @Override
    public Optional<Long> getCurrentAuditor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null ||
                !authentication.isAuthenticated() ||
                authentication instanceof AnonymousAuthenticationToken) {
            return Optional.empty();
        }

        Object principal = authentication.getPrincipal();

        // 1. Nếu là User đăng nhập thường (JWT) -> Principal chính là Entity User
        if (principal instanceof User) {
            return Optional.ofNullable(((User) principal).getId());
        }

        // 2. Nếu là User đăng nhập qua Google (OAuth2) -> Principal là OAuth2User
        if (principal instanceof OAuth2User) {
            OAuth2User oauth2User = (OAuth2User) principal;
            String email = oauth2User.getAttribute("email"); // Lấy email từ Google

            if (email != null) {
                // Tìm trong DB xem ông này là ID mấy
                return userRepository.findByEmail(email)
                        .map(User::getId);
            }
        }

        return Optional.empty();
    }
}