package com.example.vnuguideapp.config;

import com.example.vnuguideapp.entity.AccountAndAuthorization.User;
import com.example.vnuguideapp.token.TokenRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final TokenRepository tokenRepository;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {
        String servletPath = request.getServletPath();

        // 1. TỐI ƯU: Bỏ qua kiểm tra JWT cho TẤT CẢ các endpoint công khai
        // Điều này ngăn chặn lỗi khi lỡ gửi token hết hạn vào trang public (như
        // actuator)
        if (servletPath.contains("/api/v1/auth")
                || servletPath.contains("/oauth2/")
                || servletPath.contains("/login/oauth2/")
                || servletPath.contains("/actuator") // <--- Thêm dòng này
                || servletPath.contains("/ws") // <--- Thêm WebSocket
                || servletPath.contains("/swagger-ui") // <--- Thêm Swagger
                || servletPath.contains("/v3/api-docs") // <--- Thêm Swagger docs
        ) {
            filterChain.doFilter(request, response);
            return;
        }

        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String userEmail;

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        jwt = authHeader.substring(7);
        try {
            userEmail = jwtService.extractUsername(jwt); // Có thể ném lỗi nếu token format sai
        } catch (Exception e) {
            // Nếu parse token lỗi, cứ cho qua để SecurityFilterChain xử lý (trả về 401
            // chuẩn)
            filterChain.doFilter(request, response);
            return;
        }

        if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            UserDetails userDetails = this.userDetailsService.loadUserByUsername(userEmail);

            if (userDetails instanceof User user) {
                var isTokenValid = tokenRepository.findByToken(jwt)
                        .map(t -> !t.isExpired() && !t.isRevoked())
                        .orElse(false);

                if (jwtService.isTokenValid(jwt, user) && isTokenValid) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities());
                    authToken.setDetails(
                            new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
                // Token invalid → không set authentication → Spring Security sẽ trả 401 qua
                // AuthenticationEntryPoint
            }
        }

        filterChain.doFilter(request, response);
    }
}