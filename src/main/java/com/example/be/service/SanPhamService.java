package com.example.be.service;

import com.example.be.entity.SanPham;
import org.springframework.data.domain.Page;
import java.util.List;

public interface SanPhamService {
    List<SanPham> getAll();
    Page<SanPham> getPage(int pageNo, int pageSize);
    Page<SanPham> searchFilter(String keyword, Long idThuongHieu, Long idLoaiGiay, Integer trangThai, String sort, int pageNo, int pageSize);
    SanPham getById(Long id);
    SanPham save(SanPham sanPham);
    SanPham update(Long id, SanPham sanPham);
    void delete(Long id);
    void toggleStatus(Long id);
}
