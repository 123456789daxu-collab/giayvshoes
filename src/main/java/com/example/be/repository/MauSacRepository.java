package com.example.be.repository;

import com.example.be.entity.MauSac;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

@Repository
public interface MauSacRepository extends JpaRepository<MauSac, Long> {
    @Query("SELECT m FROM MauSac m WHERE (:keyword IS NULL OR (LOWER(m.tenMauSac) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(m.maMauSac) LIKE LOWER(CONCAT('%', :keyword, '%')))) AND (:trangThai IS NULL OR m.trangThai = :trangThai)")
    Page<MauSac> search(@Param("keyword") String keyword, @Param("trangThai") Boolean trangThai, Pageable pageable);

    Optional<MauSac> findByTenMauSacIgnoreCase(String tenMauSac);
}
