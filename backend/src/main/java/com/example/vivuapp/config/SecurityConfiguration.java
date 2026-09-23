package com.example.vivuapp.config;

import com.example.vivuapp.authentication.CustomOAuth2UserService;
import com.example.vivuapp.authentication.OAuth2AuthenticationSuccessHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.logout.LogoutHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
@Slf4j
public class SecurityConfiguration {

        private static final String[] WHITE_LIST_URL = {
                        "/api/v1/auth/**",
                        "/api/v1/admin/**", // Admin endpoints (public for now - hardcoded auth)
                        "/login/oauth2/**",
                        "/oauth2/**",
                        "/oauth2-redirect.html",
                        "/swagger-ui/**",
                        "/v3/api-docs/**",
                        "/swagger-resources/**",
                        "/swagger-ui.html",
                        "/ws/**",
                        "/",
                        // Public API endpoints - VNU Guide
                        "/api/v1/areas",
                        "/api/v1/place-types",
                        "/api/v1/locations/**",
                        "/api/v1/places",
                        "/api/v1/places/nearby",
                        "/api/v1/places/**",
                        "/api/v1/tours/*"
        };

        private final JwtAuthenticationFilter jwtAuthenticationFilter;
        private final AuthenticationProvider authenticationProvider;
        private final LogoutHandler logoutHandler;
        private final CustomOAuth2UserService customOAuth2UserService;
        private final OAuth2AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler;
        private final CustomAuthenticationEntryPoint customAuthenticationEntryPoint;

        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
                log.info("=== Configuring SecurityFilterChain ===");

                http
                                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                                .csrf(AbstractHttpConfigurer::disable)
                                .authorizeHttpRequests(authorize -> authorize
                                                .requestMatchers(WHITE_LIST_URL).permitAll()
                                                .requestMatchers("/error").permitAll()
                                                .anyRequest().authenticated())
                                .exceptionHandling(exception -> exception
                                                .authenticationEntryPoint(customAuthenticationEntryPoint))
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                                .authenticationProvider(authenticationProvider)
                                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                                .oauth2Login(oauth2 -> {
                                        oauth2.userInfoEndpoint(
                                                        userInfo -> userInfo.oidcUserService(customOAuth2UserService));
                                        oauth2.successHandler(oAuth2AuthenticationSuccessHandler);
                                })
                                .logout(logout -> logout
                                                .logoutUrl("/api/v1/auth/logout")
                                                .addLogoutHandler(logoutHandler)
                                                .logoutSuccessHandler((request, response,
                                                                authentication) -> SecurityContextHolder
                                                                                .clearContext()));

                return http.build();
        }

        @Bean
        public CorsConfigurationSource corsConfigurationSource() {
                CorsConfiguration configuration = new CorsConfiguration();

                // Dùng setAllowedOriginPatterns thay vì setAllowedOrigins để hỗ trợ credentials
                configuration.setAllowedOriginPatterns(List.of("*"));

                // Cho phép tất cả HTTP methods
                configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));

                // Cho phép tất cả headers
                configuration.setAllowedHeaders(List.of("*"));

                // Cho phép frontend đọc các headers này từ response
                configuration.setExposedHeaders(List.of("Authorization", "Content-Type", "X-Total-Count"));

                // Cho phép gửi cookies/credentials
                configuration.setAllowCredentials(true);

                // Cache preflight request trong 1 giờ (giảm số lượng OPTIONS request)
                configuration.setMaxAge(3600L);

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                source.registerCorsConfiguration("/**", configuration);

                log.info("CORS configured: Allow all origins with credentials");
                return source;
        }
}