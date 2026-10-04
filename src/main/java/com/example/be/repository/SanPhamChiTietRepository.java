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
           "  OR LOWER(s.sanPham.maSanPham) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "  OR LOWER(s.ma) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<SanPhamChiTiet> searchGlobal(@Param("keyword") String keyword, Pageable pageable);
    
    @Query("SELECT s FROM SanPhamChiTiet s WHERE s.sanPham.id = :sanPhamId")
    Page<SanPhamChiTiet> findBySanPhamId(@Param("sanPhamId") Long sanPhamId, Pageable pageable);
    
    @Query("SELECT s FROM SanPhamChiTiet s WHERE s.sanPham.id = :sanPhamId ORDER BY s.id DESC")
    List<SanPhamChiTiet> findBySanPhamId(@Param("sanPhamId") Long sanPhamId);

    @Query("SELECT s FROM SanPhamChiTiet s WHERE s.sanPham.id = :sanPhamId AND (s.trangThai IS NULL OR s.trangThai = 1) ORDER BY s.id DESC")
    List<SanPhamChiTiet> findBySanPhamIdActiveOnly(@Param("sanPhamId") Long sanPhamId);

    @Query("SELECT s FROM SanPhamChiTiet s " +
           "LEFT JOIN FETCH s.sanPham sp " +
           "LEFT JOIN FETCH s.mauSac ms " +
           "LEFT JOIN FETCH s.coGiay cg " +
           "LEFT JOIN FETCH sp.thuongHieu th " +
           "LEFT JOIN FETCH sp.danhMuc dm " +
           "LEFT JOIN FETCH sp.loaiGiay lg " +
           "LEFT JOIN FETCH sp.chatLieu cl " +
           "WHERE s.soLuongTon > 0 " +
           "AND (s.trangThai = 1) " +
           "AND (sp.trangThai = 1) " +
           "AND (ms IS NULL OR ms.trangThai IS NULL OR ms.trangThai = true) " +
           "AND (cg IS NULL OR cg.trangThai IS NULL OR cg.trangThai = true) " +
           "AND (th IS NULL OR th.trangThai IS NULL OR th.trangThai = true) " +
           "AND (dm IS NULL OR dm.trangThai IS NULL OR dm.trangThai = true) " +
           "AND (lg IS NULL OR lg.trangThai IS NULL OR lg.trangThai = true) " +
           "AND (cl IS NULL OR cl.trangThai IS NULL OR cl.trangThai = true) " +
           "AND (:keyword IS NULL OR :keyword = '' " +
           "  OR LOWER(sp.tenSanPham) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "  OR LOWER(s.ma) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "  OR LOWER(ms.tenMauSac) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "  OR CAST(cg.sizeGiay AS string) LIKE CONCAT('%', :keyword, '%')) " +
           "ORDER BY s.id DESC")
    List<SanPhamChiTiet> searchForSale(@Param("keyword") String keyword);
}
