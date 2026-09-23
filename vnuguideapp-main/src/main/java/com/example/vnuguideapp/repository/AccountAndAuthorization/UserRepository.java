package com.example.vnuguideapp.repository.AccountAndAuthorization;

import com.example.vnuguideapp.entity.AccountAndAuthorization.User;
import com.example.vnuguideapp.enums.Status;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

        @EntityGraph(value = "User.withRolesAndPermissions")
        Optional<User> findByEmail(String email);

        @Query("SELECT u FROM User u " +
                        "WHERE (LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%')) " +
                        "OR LOWER(u.email) = LOWER(:query)) " +
                        "AND u.id != :excludeUserId " +
                        "AND u.status = :status")
        Slice<User> searchByUsernameOrEmail(
                        @Param("query") String query,
                        @Param("excludeUserId") Long excludeUserId,
                        @Param("status") Status status,
                        Pageable pageable);

        // Admin search with filters
        @Query("SELECT DISTINCT u FROM User u " +
                        "LEFT JOIN u.roles r " +
                        "WHERE (:search IS NULL OR :search = '' OR " +
                        "LOWER(u.username) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
                        "LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
                        "LOWER(u.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
                        "LOWER(u.lastName) LIKE LOWER(CONCAT('%', :search, '%'))) " +
                        "AND (:role IS NULL OR :role = '' OR UPPER(r.name) = UPPER(:role)) " +
                        "AND (:status IS NULL OR u.status = :status)")
        Page<User> searchForAdmin(
                        @Param("search") String search,
                        @Param("role") String role,
                        @Param("status") Status status,
                        Pageable pageable);

        long countByStatus(Status status);

        long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
}
