package com.example.vnuguideapp.service.AccountAndAuthorization;


import com.example.vnuguideapp.authentication.RegisterRequest;
import com.example.vnuguideapp.dto.reponse.AccountAndAuthorization.UserSearchResponse;
import com.example.vnuguideapp.dto.request.AccountAndAuthorization.ChangePasswordRequest;
import com.example.vnuguideapp.entity.AccountAndAuthorization.User;
import com.example.vnuguideapp.entity.AccountAndAuthorization.UserProfile;
import com.example.vnuguideapp.enums.RelationshipStatus;
import com.example.vnuguideapp.enums.Status;
import com.example.vnuguideapp.exception.exceptionImpl.PasswordException;
import com.example.vnuguideapp.exception.exceptionImpl.ResourceNotFoundException;
import com.example.vnuguideapp.repository.AccountAndAuthorization.UserProfileRepository;
import com.example.vnuguideapp.repository.AccountAndAuthorization.UserRepository;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE,makeFinal=true)
public class UserService {

    UserRepository userRepository;
    UserProfileRepository userProfileRepository;
    PasswordEncoder passwordEncoder;
    RelationshipService relationshipService;

    public void changePassword(@Valid ChangePasswordRequest changePasswordRequest, User currentUser) {
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User with id " + currentUser.getId() + " not found"));

        if(!passwordEncoder.matches(changePasswordRequest.oldPassword(), user.getPassword())){
            throw new PasswordException("Old password is incorrect");
        }

        if(!changePasswordRequest.newPassword().equals(changePasswordRequest.confirmPassword())){
            throw new PasswordException("New password and confirm new password do not match");
        }

        user.setPassword(passwordEncoder.encode(changePasswordRequest.newPassword()));
        userRepository.save(user);

    }

    public Slice<UserSearchResponse> searchUsers(String query, User currentUser, Pageable pageable) {
        if (query == null || query.trim().isEmpty()) {
            return new SliceImpl<>(java.util.Collections.emptyList(), pageable, false);
        }

        String trimmedQuery = query.trim();
        
        Slice<User> users = userRepository.searchByUsernameOrEmail(
                trimmedQuery,
                currentUser.getId(),
                Status.ACTIVE,
                pageable
        );

        return users.map(user -> mapToUserSearchResponse(user, currentUser));
    }

    private UserSearchResponse mapToUserSearchResponse(User user, User currentUser) {
        RelationshipStatus relationshipStatus = relationshipService.getRelationshipStatus(
                currentUser.getId(),
                user.getId()
        );

        UserProfile profile = userProfileRepository.findByUserId(user.getId())
                .orElse(null);

        String displayName = profile != null && profile.getDisplayName() != null
                ? profile.getDisplayName()
                : user.getFirstName() + " " + user.getLastName();

        String avatarUrl = profile != null ? profile.getAvatarUrl() : null;

        String email = null;
        if (relationshipStatus == RelationshipStatus.ACCEPTED) {
            email = user.getEmail();
        }

        return UserSearchResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .displayName(displayName)
                .email(email)
                .avatarUrl(avatarUrl)
                .relationshipStatus(relationshipStatus)
                .build();
    }

}
