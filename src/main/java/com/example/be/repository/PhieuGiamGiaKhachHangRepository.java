package com.example.be.repository;

import com.example.be.entity.PhieuGiamGiaKhachHang;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PhieuGiamGiaKhachHangRepository extends JpaRepository<PhieuGiamGiaKhachHang, Long> {
    
    // Find customer mappings for a specific voucher
    List<PhieuGiamGiaKhachHang> findByPhieuGiamGiaId(Long voucherId);
    
    // Delete all customer mappings for a specific voucher
    void deleteByPhieuGiamGiaId(Long voucherId);
}
