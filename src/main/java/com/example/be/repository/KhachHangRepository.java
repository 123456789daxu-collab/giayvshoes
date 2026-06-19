package com.example.be.repository;

import com.example.be.entity.KhachHang;
import com.example.be.dto.KhachHangVoucherDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface KhachHangRepository extends JpaRepository<KhachHang, Long>, JpaSpecificationExecutor<KhachHang> {
    boolean existsBySoDienThoai(String soDienThoai);
    boolean existsByEmail(String email);
    Optional<KhachHang> findByMaKhachHang(String maKhachHang);
    
    // Tìm mã khách hàng lớn nhất có tiền tố KH để tự sinh mã KHxxxxx
    Optional<KhachHang> findFirstByMaKhachHangStartingWithOrderByMaKhachHangDesc(String prefix);

    @Query("SELECT new com.example.be.dto.KhachHangVoucherDto(" +
           "kh.id, kh.maKhachHang, kh.hoTen, kh.soDienThoai, kh.email, kh.ngaySinh, " +
           "MAX(hd.ngayTao), COUNT(hd.id), SUM(hd.tongTien)) " +
           "FROM KhachHang kh " +
           "LEFT JOIN HoaDon hd ON hd.khachHang.id = kh.id " +
           "WHERE (:search IS NULL OR LOWER(kh.hoTen) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "   OR LOWER(kh.maKhachHang) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "   OR kh.soDienThoai LIKE CONCAT('%', :search, '%') " +
           "   OR LOWER(kh.email) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:month IS NULL OR MONTH(hd.ngayTao) = :month) " +
           "AND (:year IS NULL OR YEAR(hd.ngayTao) = :year) " +
           "GROUP BY kh.id, kh.maKhachHang, kh.hoTen, kh.soDienThoai, kh.email, kh.ngaySinh")
    Page<KhachHangVoucherDto> getCustomerStatisticsForVoucher(
            @Param("search") String search, 
            @Param("month") Integer month, 
            @Param("year") Integer year, 
            Pageable pageable
    );
}

