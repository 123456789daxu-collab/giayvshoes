package com.example.be.repository;

import com.example.be.entity.CoGiay;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

@Repository
public interface CoGiayRepository extends JpaRepository<CoGiay, Long> {
    @Query("SELECT c FROM CoGiay c WHERE (:keyword IS NULL OR (LOWER(CAST(c.sizeGiay AS string)) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(c.maCoGiay) LIKE LOWER(CONCAT('%', :keyword, '%')))) AND (:trangThai IS NULL OR c.trangThai = :trangThai)")
    Page<CoGiay> search(@Param("keyword") String keyword, @Param("trangThai") Boolean trangThai, Pageable pageable);

    Optional<CoGiay> findBySizeGiay(Integer sizeGiay);
}
