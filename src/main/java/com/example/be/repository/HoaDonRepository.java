package com.example.be.repository;

import com.example.be.entity.HoaDon;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface HoaDonRepository extends JpaRepository<HoaDon, Long> {
    
    List<HoaDon> findByGiaoCaId(Long giaoCaId);

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
           "AND (:endDate IS NULL OR h.ngayTao <= :endDate) " +
           "ORDER BY h.ngayTao DESC")
    List<HoaDon> searchHoaDon(
            @Param("keyword") String keyword,
            @Param("trangThai") Integer trangThai,
            @Param("loaiHoaDon") Boolean loaiHoaDon,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    @Query("SELECT MAX(h.tongTien) FROM HoaDon h")
    BigDecimal getMaxPrice();

    @Query("SELECT h FROM HoaDon h WHERE (h.khachHang IS NOT NULL AND h.khachHang.id = :khId) OR (h.sdtNguoiNhan IS NOT NULL AND h.sdtNguoiNhan = :sdt) ORDER BY h.ngayTao DESC")
    List<HoaDon> findByKhachHangIdOrSdtNguoiNhan(@Param("khId") Long khId, @Param("sdt") String sdt);
}
