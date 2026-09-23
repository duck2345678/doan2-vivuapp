
package com.example.vnuguideapp.config;

import com.example.vnuguideapp.entity.AccountAndAuthorization.Role;
import com.example.vnuguideapp.entity.AccountAndAuthorization.User;
import com.example.vnuguideapp.entity.AccountAndAuthorization.UserProfile;
import com.example.vnuguideapp.enums.Status;
import com.example.vnuguideapp.exception.exceptionImpl.ResourceNotFoundException;
import com.example.vnuguideapp.repository.AccountAndAuthorization.RoleRepository;
import com.example.vnuguideapp.repository.AccountAndAuthorization.UserRepository;
import com.example.vnuguideapp.repository.AccountAndAuthorization.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

        private final PasswordEncoder passwordEncoder;
        private final UserRepository userRepository;
        private final RoleRepository roleRepository;
        private final UserProfileRepository userProfileRepository;

        @Override
        public void run(String... args) throws Exception {


                if (roleRepository.findAll().isEmpty()) {
                        var adminRole = Role.builder()
                                        .name("ADMIN")
                                        .createdBy(1L)
                                        .build();
                        roleRepository.save(adminRole);

                        var userRole = Role.builder()
                                        .name("USER")
                                        .createdBy(1L)
                                        .build();
                        roleRepository.save(userRole);
                }

                if (userRepository.findAll().isEmpty()) {
                        var adminUser = User.builder()
                                        .firstName("admin")
                                        .lastName("admin")
                                        .username("admin")
                                        .email("admin@gmail.com")
                                        .password(passwordEncoder.encode("admin"))
                                        .roles(
                                                        Set.of(
                                                                        roleRepository.findByName("ADMIN")
                                                                                        .orElseThrow(() -> new ResourceNotFoundException(
                                                                                                        "Role ADMIN not found"))))
                                        .createdBy(1L)
                                        .status(Status.ACTIVE)
                                        .build();
                        var savedAdmin = userRepository.save(adminUser);

                        // Create profile for admin user
                        createProfileIfNotExists(savedAdmin);

                        var user1 = User.builder()
                                        .firstName("user")
                                        .lastName("user")
                                        .username("user")
                                        .email("user@gmail.com")
                                        .password(passwordEncoder.encode("user"))
                                        .roles(
                                                        Set.of(
                                                                        roleRepository.findByName("USER")
                                                                                        .orElseThrow(() -> new ResourceNotFoundException(
                                                                                                        "Role USER not found"))))
                                        .createdBy(1L)
                                        .status(Status.ACTIVE)
                                        .build();
                        var savedUser = userRepository.save(user1);

                        // Create profile for regular user
                        createProfileIfNotExists(savedUser);

                } else {
                        // Ensure profiles exist for all existing users (backward compatibility)
                        ensureProfilesExist();
                }
        }

        /**
         * Creates a UserProfile for a user if one doesn't already exist.
         */
        private void createProfileIfNotExists(User user) {
                if (!userProfileRepository.existsByUserId(user.getId())) {
                        var profile = UserProfile.builder()
                                        .user(user)
                                        .displayName(user.getFirstName() + " " + user.getLastName())
                                        .isPrivate(false)
                                        .createdBy(user.getId())
                                        .build();
                        userProfileRepository.save(profile);
                        log.info("Created profile for user: {}", user.getEmail());
                }
        }

        /**
         * Ensures all existing users have a profile.
         * This handles the case where users were created before profile auto-creation
         * was implemented.
         */
        private void ensureProfilesExist() {
                var users = userRepository.findAll();
                for (User user : users) {
                        createProfileIfNotExists(user);
                }
        }
}