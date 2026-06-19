package com.example.be.repository;

import com.example.be.entity.DotGiamGia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DotGiamGiaRepository extends JpaRepository<DotGiamGia, Long> {
    
    @Query("SELECT d FROM DotGiamGia d WHERE " +
           "(:keyword IS NULL OR LOWER(d.maDotGiamGia) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(d.tenDotGiamGia) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "AND (:trangThai IS NULL OR d.trangThai = :trangThai) " +
           "ORDER BY d.id DESC")
    List<DotGiamGia> searchDotGiamGia(@Param("keyword") String keyword, @Param("trangThai") Integer trangThai);
}
