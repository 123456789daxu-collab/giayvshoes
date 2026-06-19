package com.example.be.service.impl;

import com.example.be.entity.SanPham;
import com.example.be.repository.SanPhamRepository;
import com.example.be.service.SanPhamService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class SanPhamServiceImpl implements SanPhamService {

    @Autowired
    private SanPhamRepository sanPhamRepository;

    @Autowired
    private com.example.be.repository.SanPhamChiTietRepository sanPhamChiTietRepository;

    @Override
    public Page<SanPham> search(String keyword, Integer trangThai, Integer soLuongTon, Long idThuongHieu, Long idLoaiGiay, Pageable pageable) {
        if ((keyword != null && !keyword.isEmpty()) || trangThai != null || soLuongTon != null || idThuongHieu != null || idLoaiGiay != null) {
            return sanPhamRepository.search(keyword, trangThai, soLuongTon, idThuongHieu, idLoaiGiay, pageable);
        }
        return sanPhamRepository.findAll(pageable);
    }

    @Override
    public SanPham findById(Long id) {
        return sanPhamRepository.findById(id).orElse(null);
    }

    @Override
    public SanPham save(SanPham sanPham) {
        if (sanPham.getId() == null) {
            sanPham.setNgayTao(LocalDateTime.now());
        }
        sanPham.setNgaySua(LocalDateTime.now());
        return sanPhamRepository.save(sanPham);
    }

    @Override
    public void deleteById(Long id) {
        try {
            // Xóa tất cả các biến thể chi tiết trước khi xóa sản phẩm cha
            java.util.List<com.example.be.entity.SanPhamChiTiet> variants = sanPhamChiTietRepository.findBySanPhamId(id);
            if (variants != null && !variants.isEmpty()) {
                sanPhamChiTietRepository.deleteAll(variants);
            }
            
            // Xóa sản phẩm cha
            sanPhamRepository.deleteById(id);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new RuntimeException("Không thể xóa sản phẩm này vì đang có dữ liệu hóa đơn liên quan. Vui lòng chuyển trạng thái sang Ngừng Kinh Doanh thay vì xóa!");
        }
    }

    @Override
    public boolean existsByTenSanPham(String tenSanPham) {
        return sanPhamRepository.existsByTenSanPham(tenSanPham);
    }

    @Override
    public boolean existsByMaSanPham(String maSanPham) {
        return sanPhamRepository.existsByMaSanPham(maSanPham);
    }
}
