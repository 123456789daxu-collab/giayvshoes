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

    @Query("SELECT h FROM HoaDon h LEFT JOIN h.khachHang kh WHERE " +
           "(:keyword IS NULL OR LOWER(h.maHoaDon) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(kh.hoTen) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(kh.soDienThoai) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(h.tenNguoiNhan) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(h.sdtNguoiNhan) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "AND (:trangThai IS NULL OR h.trangThai = :trangThai) " +
           "AND (:loaiHoaDon IS NULL OR h.loaiHoaDon = :loaiHoaDon) " +
           "AND (:minPrice IS NULL OR h.tongTien >= :minPrice) " +
           "AND (:maxPrice IS NULL OR h.tongTien <= :maxPrice) " +
           "AND (:startDate IS NULL OR h.ngayTao >= :startDate) " +
           "AND (:endDate IS NULL OR h.ngayTao < :endDate) " +
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
}
