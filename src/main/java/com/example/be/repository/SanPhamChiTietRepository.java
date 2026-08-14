package com.example.be.repository;

import com.example.be.entity.SanPhamChiTiet;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

@Repository
public interface SanPhamChiTietRepository extends JpaRepository<SanPhamChiTiet, Long>, JpaSpecificationExecutor<SanPhamChiTiet> {
    @Query("SELECT s FROM SanPhamChiTiet s " +
           "WHERE (:keyword IS NULL OR :keyword = '' " +
           "  OR LOWER(s.sanPham.tenSanPham) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "  OR LOWER(s.ma) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<SanPhamChiTiet> searchGlobal(@Param("keyword") String keyword, Pageable pageable);
    
    @Query("SELECT s FROM SanPhamChiTiet s WHERE s.sanPham.id = :sanPhamId")
    Page<SanPhamChiTiet> findBySanPhamId(@Param("sanPhamId") Long sanPhamId, Pageable pageable);
    
    @Query("SELECT s FROM SanPhamChiTiet s WHERE s.sanPham.id = :sanPhamId")
    List<SanPhamChiTiet> findBySanPhamId(@Param("sanPhamId") Long sanPhamId);

    @Query("SELECT s FROM SanPhamChiTiet s WHERE s.sanPham.id = :sanPhamId AND (s.trangThai IS NULL OR s.trangThai = 1)")
    List<SanPhamChiTiet> findBySanPhamIdActiveOnly(@Param("sanPhamId") Long sanPhamId);

    @Query("SELECT s FROM SanPhamChiTiet s " +
           "LEFT JOIN FETCH s.sanPham sp " +
           "LEFT JOIN FETCH s.mauSac ms " +
           "LEFT JOIN FETCH s.coGiay cg " +
           "WHERE s.soLuongTon > 0 " +
           "AND (s.trangThai IS NULL OR s.trangThai = 1) " +
           "AND (sp.trangThai IS NULL OR sp.trangThai = 1) " +
           "AND (:keyword IS NULL OR :keyword = '' " +
           "  OR LOWER(sp.tenSanPham) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "  OR LOWER(s.ma) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "  OR LOWER(ms.tenMauSac) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "  OR CAST(cg.sizeGiay AS string) LIKE CONCAT('%', :keyword, '%')) " +
           "ORDER BY s.id DESC")
    List<SanPhamChiTiet> searchForSale(@Param("keyword") String keyword);
}
