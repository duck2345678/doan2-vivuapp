package com.example.vivuapp.repository.AccountAndAuthorization;

import com.example.vivuapp.entity.AccountAndAuthorization.Role;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByName(String name);


    @Override
    @EntityGraph(attributePaths = "permissions")
    Optional<Role> findById(Long id);
}
