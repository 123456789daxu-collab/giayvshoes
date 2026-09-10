package com.example.be.repository;

import com.example.be.entity.PhieuGiamGia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PhieuGiamGiaRepository extends JpaRepository<PhieuGiamGia, Long>, JpaSpecificationExecutor<PhieuGiamGia> {
    
    // Find the largest voucher code with a prefix to auto-generate codes like PGG00001
    Optional<PhieuGiamGia> findFirstByMaVoucherStartingWithOrderByMaVoucherDesc(String prefix);

    // Find voucher by exact code
    Optional<PhieuGiamGia> findByMaVoucher(String maVoucher);

    boolean existsByMaVoucher(String maVoucher);

    @org.springframework.data.jpa.repository.Query("SELECT p FROM PhieuGiamGia p WHERE p.trangThai = 1 " +
           "AND (p.soLuong > COALESCE(p.soLuongDaDung, 0)) " +
           "AND (p.ngayBatDau IS NULL OR p.ngayBatDau <= :now) " +
           "AND (p.ngayKetThuc IS NULL OR p.ngayKetThuc >= :now) " +
           "ORDER BY p.id DESC")
    java.util.List<PhieuGiamGia> findAvailableVouchers(@org.springframework.data.repository.query.Param("now") java.time.LocalDateTime now);
}
