package com.example.be.repository;

import com.example.be.entity.HoaDon;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface HoaDonRepository extends JpaRepository<HoaDon, Long> {

    @Query("SELECT h FROM HoaDon h WHERE " +
           "(:keyword IS NULL OR LOWER(h.maHoaDon) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(h.khachHang.hoTen) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(h.khachHang.soDienThoai) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "AND (:trangThai IS NULL OR h.trangThai = :trangThai) " +
           "AND (:loaiHoaDon IS NULL OR h.loaiHoaDon = :loaiHoaDon) " +
           "AND (:minPrice IS NULL OR h.tongTienThanhToan >= :minPrice) " +
           "AND (:maxPrice IS NULL OR h.tongTienThanhToan <= :maxPrice) " +
           "AND (cast(:startDate as timestamp) IS NULL OR h.ngayTao >= :startDate) " +
           "AND (cast(:endDate as timestamp) IS NULL OR h.ngayTao <= :endDate) " +
           "ORDER BY h.ngayTao DESC")
    List<HoaDon> searchHoaDon(
            @Param("keyword") String keyword,
            @Param("trangThai") Integer trangThai,
            @Param("loaiHoaDon") String loaiHoaDon,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    List<HoaDon> findByTrangThaiAndLoaiHoaDonOrderByNgayTaoDesc(Integer trangThai, String loaiHoaDon);

    Optional<HoaDon> findFirstByMaHoaDonStartingWithOrderByMaHoaDonDesc(String prefix);

    List<HoaDon> findByKhachHangId(Long khachHangId);
    List<HoaDon> findByNhanVienId(Long nhanVienId);
}
