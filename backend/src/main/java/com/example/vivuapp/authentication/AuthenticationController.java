package com.example.vivuapp.authentication;

import com.example.vivuapp.dto.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

@RestController
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication Controller", description = "APIs for user registration and authentication")
public class AuthenticationController {

    final AuthenticationService service;

    @PostMapping("/register")
    public ApiResponse<?> register(
       @Valid @RequestBody RegisterRequest request
    ) {

        service.register(request);
        return ApiResponse.builder()
                .code(200)
                .message("User registered successfully. Please check your email for the OTP to verify your account.")
                .build();
    }

    @PostMapping("/forget-password")
    public ApiResponse<?> forgetPassword(
         @Valid @RequestBody ForgetPasswordRequest request
    ) {
        service.forgetPassword(request);
        return ApiResponse.builder()
                .code(200)
                .message("Password reset OTP sent successfully. Please check your email.")
                .build();
    }

    @PostMapping("/verify-otp-register")
    public ApiResponse<AuthenticationResponse> verifyOtp(
            @RequestBody @Valid VerifyRequest request
    ) {
        AuthenticationResponse authenticationResponse = service.verifyOtpRegister(request);
        return ApiResponse.<AuthenticationResponse>builder()
                .code(200)
                .message("User verified and registered successfully")
                .result(authenticationResponse)
                .build();
    }

    @PostMapping("/verify-otp-forget-password")
    public ApiResponse<AuthenticationResponse> verifyOtpForgetPassword(
            @RequestBody @Valid VerifyRequest request
    ) {
        AuthenticationResponse authenticationResponse = service.verifyOtpForgetPassword(request);
        return ApiResponse.<AuthenticationResponse>builder()
                .code(200)
                .message("User verified and reset password successfully")
                .result(authenticationResponse)
                .build();

    }



    @PostMapping("/authenticate")
    public ApiResponse<AuthenticationResponse> authenticate(
            @RequestBody AuthenticationRequest request
    ) {
        AuthenticationResponse authenticationResponse = service.authenticate(request);
        return ApiResponse.<AuthenticationResponse>builder()
                .code(200)
                .message("User authenticated successfully")
                .result(authenticationResponse)
                .build();
    }

    @PostMapping("/refresh-token")
    public void refreshToken(
            HttpServletRequest request,
            HttpServletResponse response
    ) throws IOException {
        service.refreshToken(request, response);
    }


}
