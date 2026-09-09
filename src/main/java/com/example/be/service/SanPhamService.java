package com.example.be.service;

import com.example.be.entity.SanPham;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface SanPhamService {
    Page<SanPham> search(String keyword, Integer trangThai, Integer soLuongTon, Long idThuongHieu, Long idLoaiGiay, java.math.BigDecimal minPrice, java.math.BigDecimal maxPrice, Pageable pageable);
    SanPham findById(Long id);
    SanPham save(SanPham sanPham);
    void deleteById(Long id);
    boolean existsByTenSanPham(String tenSanPham);
    SanPham findByTenSanPham(String tenSanPham);
    boolean existsByMaSanPham(String maSanPham);
    String generateNextMaSanPham();

    List<SanPham> getAll();
    Page<SanPham> getPage(int pageNo, int pageSize);
    Page<SanPham> searchFilter(String keyword, Long idThuongHieu, Long idLoaiGiay, Integer trangThai, String sort, int pageNo, int pageSize);
    SanPham getById(Long id);
    SanPham update(Long id, SanPham sanPham);
    void delete(Long id);
    void toggleStatus(Long id);
}
