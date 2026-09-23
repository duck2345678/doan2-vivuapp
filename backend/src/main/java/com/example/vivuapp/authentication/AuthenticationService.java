package com.example.vivuapp.authentication;

import com.example.vivuapp.config.JwtService;
import com.example.vivuapp.email.EmailService;
import com.example.vivuapp.entity.AccountAndAuthorization.Role;
import com.example.vivuapp.enums.Status;
import com.example.vivuapp.exception.exceptionImpl.AccountLockedException;
import com.example.vivuapp.exception.exceptionImpl.EmailAlreadyExistedException;
import com.example.vivuapp.exception.exceptionImpl.InValidOtpException;
import com.example.vivuapp.exception.exceptionImpl.ResourceNotFoundException;
import com.example.vivuapp.repository.AccountAndAuthorization.RoleRepository;
import com.example.vivuapp.repository.AccountAndAuthorization.UserProfileRepository;
import com.example.vivuapp.entity.AccountAndAuthorization.UserProfile;
import com.example.vivuapp.token.Token;
import com.example.vivuapp.token.TokenRepository;
import com.example.vivuapp.entity.AccountAndAuthorization.User;
import com.example.vivuapp.repository.AccountAndAuthorization.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.Set;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class AuthenticationService {

    UserRepository userRepository;
    PasswordEncoder passwordEncoder;
    JwtService jwtService;
    AuthenticationManager authenticationManager;
    TokenRepository tokenRepository;
    OtpService otpService;
    EmailService emailService;
    RoleRepository roleRepository;
    UserProfileRepository userProfileRepository;

    static final String KEY_PREFIX_REGISTER = "OTP_REGISTER";
    static final String KEY_PREFIX_FORGOT_PASSWORD = "OTP_FORGOT_PASSWORD";

    public void register(RegisterRequest request) {
        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new EmailAlreadyExistedException(request.email());
        }
        // Generate OTP
        String otp = otpService.generateOtp();
        // Store in Redis
        otpService.saveData(request.email(), otp, request, KEY_PREFIX_REGISTER);
        log.info("OTP saved to Redis for registration: {}", request.email());

        // Send Email asynchronously but wait for result with timeout
        try {
            emailService.sendVerificationEmail(request.email(), "Account Verification", "Your OTP is: " + otp)
                    .orTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                    .join(); // Wait for completion
            log.info("Verification email sent successfully to: {}", request.email());
        } catch (java.util.concurrent.CompletionException ex) {
            log.error("Failed to send verification email to: {}", request.email(), ex.getCause());
            // Clear OTP data since email failed
            otpService.clearData(request.email(), KEY_PREFIX_REGISTER);
            throw new RuntimeException("Failed to send verification email. Please try again.");
        }
    }

    public void forgetPassword(@Valid ForgetPasswordRequest request) {
        var user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new ResourceNotFoundException(request.email()));

        if (user.getStatus() == Status.LOCKED) {
            log.warn("Password reset failed for: {} - Account is locked", request.email());
            throw new AccountLockedException(
                    "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.");
        }

        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new RuntimeException("New password and confirm password do not match");
        }
        // Generate OTP
        String otp = otpService.generateOtp();
        // Store in Redis
        otpService.saveData(request.email(), otp, request, KEY_PREFIX_FORGOT_PASSWORD);
        log.info("OTP saved to Redis for password reset: {}", request.email());

        // Send Email asynchronously but wait for result with timeout
        try {
            emailService
                    .sendVerificationEmail(request.email(), "Password Reset", "Your OTP for password reset is: " + otp)
                    .orTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                    .join(); // Wait for completion
            log.info("Password reset email sent successfully to: {}", request.email());
        } catch (java.util.concurrent.CompletionException ex) {
            log.error("Failed to send password reset email to: {}", request.email(), ex.getCause());
            // Clear OTP data since email failed
            otpService.clearData(request.email(), KEY_PREFIX_FORGOT_PASSWORD);
            throw new RuntimeException("Failed to send password reset email. Please try again.");
        }
    }

    @Transactional
    public AuthenticationResponse verifyOtpRegister(VerifyRequest request) {
        log.info("Verifying OTP for registration: {}", request.email());

        var data = otpService.getData(request.email(), RegisterRequest.class, KEY_PREFIX_REGISTER);
        if (data == null || !data.otp().equals(request.otp())) {
            log.warn("Invalid or expired OTP for registration: {}", request.email());
            throw new InValidOtpException("Invalid or expired OTP");
        }

        Role role = roleRepository.findByName("USER")
                .orElseThrow(() -> new ResourceNotFoundException("Role USER not found"));

        RegisterRequest registerRequest = (RegisterRequest) data.request();
        var user = User.builder()
                .firstName(registerRequest.getFirstName())
                .lastName(registerRequest.getLastName())
                .email(registerRequest.email())
                .username(registerRequest.username())
                .password(passwordEncoder.encode(registerRequest.password()))
                .createdBy(1L)
                .status(Status.ACTIVE)
                .roles(Set.of(role))
                .build();

        var savedUser = userRepository.save(user);
        log.info("User registered successfully: {}", savedUser.getEmail());

        // Create default UserProfile for the new user
        var userProfile = UserProfile.builder()
                .user(savedUser)
                .displayName(registerRequest.getDisplayName())
                .isPrivate(false)
                .createdBy(savedUser.getId())
                .build();
        userProfileRepository.save(userProfile);
        log.info("UserProfile created for user: {}", savedUser.getEmail());

        var jwtToken = jwtService.generateToken(user);
        var refreshToken = jwtService.generateRefreshToken(user);
        saveUserToken(savedUser, jwtToken);

        // Clear OTP data
        otpService.clearData(request.email(), KEY_PREFIX_REGISTER);
        log.info("OTP data cleared for: {}", request.email());

        return AuthenticationResponse.builder()
                .accessToken(jwtToken)
                .refreshToken(refreshToken)
                .build();
    }

    public AuthenticationResponse verifyOtpForgetPassword(@Valid VerifyRequest request) {
        log.info("Verifying OTP for password reset: {}", request.email());

        var data = otpService.getData(request.email(), ForgetPasswordRequest.class, KEY_PREFIX_FORGOT_PASSWORD);
        if (data == null || !data.otp().equals(request.otp())) {
            log.warn("Invalid or expired OTP for password reset: {}", request.email());
            throw new InValidOtpException("Invalid or expired OTP");
        }

        ForgetPasswordRequest forgetPasswordRequest = (ForgetPasswordRequest) data.request();

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new ResourceNotFoundException(request.email()));

        revokeAllUserTokens(user);
        user.setPassword(passwordEncoder.encode(forgetPasswordRequest.newPassword()));
        user.setUpdatedBy(1L);
        var savedUser = userRepository.save(user);
        log.info("Password reset successfully for: {}", savedUser.getEmail());

        var jwtToken = jwtService.generateToken(user);
        var refreshToken = jwtService.generateRefreshToken(user);
        saveUserToken(savedUser, jwtToken);

        // Clear OTP data
        otpService.clearData(request.email(), KEY_PREFIX_FORGOT_PASSWORD);
        log.info("OTP data cleared for password reset: {}", request.email());

        return AuthenticationResponse.builder()
                .accessToken(jwtToken)
                .refreshToken(refreshToken)
                .build();
    }

    public AuthenticationResponse authenticate(AuthenticationRequest request) {
        log.info("Authentication attempt for: {}", request.email());

        // Check if user exists and is not locked
        var user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new ResourceNotFoundException(request.email()));

        if (user.getStatus() == Status.LOCKED) {
            log.warn("Authentication failed for: {} - Account is locked", request.email());
            throw new AccountLockedException(
                    "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.");
        }

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.email(),
                            request.password()));
        } catch (org.springframework.security.authentication.BadCredentialsException ex) {
            log.warn("Authentication failed for: {} - Invalid credentials", request.email());
            throw new com.example.vivuapp.exception.exceptionImpl.BadCredentialsException(
                    "Invalid email or password");
        }

        var jwtToken = jwtService.generateToken(user);
        var refreshToken = jwtService.generateRefreshToken(user);
        revokeAllUserTokens(user);
        saveUserToken(user, jwtToken);

        log.info("Authentication successful for: {}", request.email());

        return AuthenticationResponse.builder()
                .accessToken(jwtToken)
                .refreshToken(refreshToken)
                .build();
    }

    private void saveUserToken(User user, String jwtToken) {
        var token = Token.builder()
                .user(user)
                .token(jwtToken)
                .expired(false)
                .revoked(false)
                .build();
        tokenRepository.save(token);
    }

    private void revokeAllUserTokens(User user) {
        var validUserTokens = tokenRepository.findAllValidTokenByUser(user.getId());
        if (validUserTokens.isEmpty())
            return;
        validUserTokens.forEach(token -> {
            token.setExpired(true);
            token.setRevoked(true);
        });
        tokenRepository.saveAll(validUserTokens);
    }

    public void refreshToken(
            HttpServletRequest request,
            HttpServletResponse response) throws IOException {
        final String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        final String refreshToken;
        final String userEmail;
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.warn("Refresh token request missing or invalid Authorization header");
            return;
        }
        refreshToken = authHeader.substring(7);
        userEmail = jwtService.extractUsername(refreshToken);
        if (userEmail != null) {
            log.info("Refresh token request for user: {}", userEmail);
            var user = this.userRepository.findByEmail(userEmail)
                    .orElseThrow();

            // Check if user account is locked (banned by admin)
            if (user.getStatus() == Status.LOCKED) {
                log.warn("Token refresh denied for locked account: {}", userEmail);
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setContentType("application/json");
                response.getWriter()
                        .write("{\"error\": \"ACCOUNT_LOCKED\", \"message\": \"Tài khoản của bạn đã bị khóa.\"}");
                return;
            }

            if (jwtService.isTokenValid(refreshToken, user)) {
                var accessToken = jwtService.generateToken(user);
                revokeAllUserTokens(user);
                saveUserToken(user, accessToken);
                var authResponse = AuthenticationResponse.builder()
                        .accessToken(accessToken)
                        .refreshToken(refreshToken)
                        .build();
                log.info("Token refreshed successfully for user: {}", userEmail);
                new ObjectMapper().writeValue(response.getOutputStream(), authResponse);
            } else {
                log.warn("Invalid refresh token for user: {}", userEmail);
            }
        }
    }

}
