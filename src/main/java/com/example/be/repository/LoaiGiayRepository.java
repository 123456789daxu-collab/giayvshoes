package com.example.be.repository;

import com.example.be.entity.LoaiGiay;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface LoaiGiayRepository extends JpaRepository<LoaiGiay, Long> {
    
    @Query("SELECT l FROM LoaiGiay l WHERE (:keyword IS NULL OR (LOWER(l.tenLoaiGiay) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(l.maLoaiGiay) LIKE LOWER(CONCAT('%', :keyword, '%')))) AND (:trangThai IS NULL OR l.trangThai = :trangThai)")
    Page<LoaiGiay> search(@Param("keyword") String keyword, @Param("trangThai") Boolean trangThai, Pageable pageable);
}
