package com.example.vivuapp.controller.AccountAndAuthorization;

import com.example.vivuapp.dto.ApiResponse;
import com.example.vivuapp.dto.reponse.AccountAndAuthorization.UserSearchResponse;
import com.example.vivuapp.dto.request.AccountAndAuthorization.ChangePasswordRequest;
import com.example.vivuapp.entity.AccountAndAuthorization.User;
import com.example.vivuapp.service.AccountAndAuthorization.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/users")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@SecurityRequirement(name ="bearerAuth")
@Tag(name = "User", description = "APIs for managing user account and authorization")
public class UserController {

    UserService userService;

        @PostMapping("/changepassword")
        public ResponseEntity<ApiResponse<String>> changePassword(
                @RequestBody @Valid ChangePasswordRequest changePasswordRequest,
                @AuthenticationPrincipal User currentUser
        ) {
            userService.changePassword(changePasswordRequest, currentUser);
            ApiResponse<String> response = ApiResponse.<String>builder()
                    .code(200)
                    .message("Password has Changed")
                    .build();
            return ResponseEntity.ok(response);
        }

        @GetMapping("/search")
        @Operation(summary = "Search users", description = "Search users by username or email with pagination")
        public ResponseEntity<ApiResponse<Slice<UserSearchResponse>>> searchUsers(
                @RequestParam String query,
                @AuthenticationPrincipal User currentUser,
                @PageableDefault(size = 20) Pageable pageable
        ) {
            Slice<UserSearchResponse> results = userService.searchUsers(query, currentUser, pageable);
            ApiResponse<Slice<UserSearchResponse>> response = ApiResponse.<Slice<UserSearchResponse>>builder()
                    .code(200)
                    .message("Search completed successfully")
                    .result(results)
                    .build();
            return ResponseEntity.ok(response);
        }

}
