package com.example.vnuguideapp.repository.AccountAndAuthorization;

import com.example.vnuguideapp.entity.AccountAndAuthorization.Permission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PermissionRepository extends JpaRepository<Permission, Long> {
    Optional<Permission> findByName(String name);
}
