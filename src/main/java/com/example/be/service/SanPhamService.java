package com.example.be.service;

import com.example.be.entity.SanPham;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface SanPhamService {
    Page<SanPham> search(String keyword, Integer trangThai, Integer soLuongTon, Long idThuongHieu, Long idLoaiGiay, Pageable pageable);
    SanPham findById(Long id);
    SanPham save(SanPham sanPham);
    void deleteById(Long id);
    boolean existsByTenSanPham(String tenSanPham);
    boolean existsByMaSanPham(String maSanPham);
}
