package com.example.be.repository;

import com.example.be.entity.ChiTietDotGiamGia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChiTietDotGiamGiaRepository extends JpaRepository<ChiTietDotGiamGia, Long> {
    
    List<ChiTietDotGiamGia> findByDotGiamGiaId(Long dotGiamGiaId);
    
    void deleteByDotGiamGiaId(Long dotGiamGiaId);
    
    @org.springframework.data.jpa.repository.Query("SELECT MAX(d.phanTramGiam) FROM ChiTietDotGiamGia c JOIN c.dotGiamGia d WHERE c.sanPhamChiTiet.id = :spctId AND d.trangThai = 1 AND d.ngayBatDau <= CURRENT_TIMESTAMP AND d.ngayKetThuc >= CURRENT_TIMESTAMP")
    Integer findMaxActiveDiscountBySanPhamChiTietId(@org.springframework.data.repository.query.Param("spctId") Long spctId);
}
