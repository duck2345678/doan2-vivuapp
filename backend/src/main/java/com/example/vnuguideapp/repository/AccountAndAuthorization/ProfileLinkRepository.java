package com.example.vnuguideapp.repository.AccountAndAuthorization;

import com.example.vnuguideapp.entity.AccountAndAuthorization.ProfileLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for ProfileLink entity
 */
@Repository
public interface ProfileLinkRepository extends JpaRepository<ProfileLink, Long> {

    /**
     * Find all links for a profile ordered by display order
     */
    List<ProfileLink> findByProfileIdOrderByDisplayOrderAsc(Long profileId);

    /**
     * Delete all links for a profile
     */
    void deleteByProfileId(Long profileId);
}
