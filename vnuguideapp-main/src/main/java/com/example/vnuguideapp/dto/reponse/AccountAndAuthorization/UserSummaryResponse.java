package com.example.vnuguideapp.dto.reponse.AccountAndAuthorization;

import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * Summary response DTO for user information in lists.
 * Used for friends list, friend requests, etc.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserSummaryResponse {

    /**
     * User ID.
     */
    Long id;

    /**
     * User's first name.
     */
    String firstName;

    /**
     * User's last name.
     */
    String lastName;

    /**
     * User's email.
     */
    String email;

    /**
     * User's avatar URL.
     */
    String avatarUrl;

    /**
     * User's display name (if set).
     */
    String displayName;

    /**
     * User's username.
     */
    String username;
}
