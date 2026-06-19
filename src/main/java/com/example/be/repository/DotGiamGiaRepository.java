package com.example.be.repository;

import com.example.be.entity.DotGiamGia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DotGiamGiaRepository extends JpaRepository<DotGiamGia, Long>, JpaSpecificationExecutor<DotGiamGia> {
    
    // Find the largest discount campaign code starting with a prefix to auto-generate codes like DGG001
    @Query("SELECT d FROM DotGiamGia d WHERE " +
           "(:keyword IS NULL OR LOWER(d.maDotGiamGia) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(d.tenDotGiamGia) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "AND (:trangThai IS NULL OR d.trangThai = :trangThai) " +
           "AND (:hinhThucGiam IS NULL OR d.hinhThucGiam = :hinhThucGiam) " +
           "AND (:giaTriGiam IS NULL OR d.giaTriGiam = :giaTriGiam) " +
           "ORDER BY d.id DESC")
    List<DotGiamGia> searchDotGiamGia(@Param("keyword") String keyword, 
                                      @Param("trangThai") Integer trangThai,
                                      @Param("hinhThucGiam") String hinhThucGiam,
                                      @Param("giaTriGiam") java.math.BigDecimal giaTriGiam);

    Optional<DotGiamGia> findFirstByMaDotGiamGiaStartingWithOrderByMaDotGiamGiaDesc(String prefix);
}
