package com.example.vnuguideapp.repository.File;

import com.example.vnuguideapp.entity.Storage.FileEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FileRepository extends JpaRepository<FileEntity, Long> {
}

