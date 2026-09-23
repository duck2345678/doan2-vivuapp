package com.example.vivuapp.repository.AccountAndAuthorization;

import com.example.vivuapp.entity.AccountAndAuthorization.Permission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PermissionRepository extends JpaRepository<Permission, Long> {
    Optional<Permission> findByName(String name);
}
