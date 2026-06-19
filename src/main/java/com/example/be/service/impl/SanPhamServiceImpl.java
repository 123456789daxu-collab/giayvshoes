package com.example.be.service.impl;

import com.example.be.entity.SanPham;
import com.example.be.repository.SanPhamRepository;
import com.example.be.service.SanPhamService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

@Service
public class SanPhamServiceImpl implements SanPhamService {

    @Autowired
    private SanPhamRepository sanPhamRepository;

    @Override
    public List<SanPham> getAll() {
        return sanPhamRepository.findAll((org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "id")));
    }

    @Override
    public Page<SanPham> getPage(int pageNo, int pageSize) {
        Pageable pageable = PageRequest.of(pageNo - 1, pageSize, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "id"));
        return sanPhamRepository.findAll(pageable);
    }

    @Override
    public Page<SanPham> searchFilter(String keyword, Long idThuongHieu, Long idLoaiGiay, Integer trangThai, String sort, int pageNo, int pageSize) {
        org.springframework.data.domain.Sort sortObj = org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "id");
        
        if (sort != null && !sort.isEmpty()) {
            switch (sort) {
                case "name_asc":
                    sortObj = org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "tenSanPham");
                    break;
                case "name_desc":
                    sortObj = org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "tenSanPham");
                    break;
                case "price_asc":
                    sortObj = org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "giaBan");
                    break;
                case "price_desc":
                    sortObj = org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "giaBan");
                    break;
                case "qty_desc":
                    sortObj = org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "soLuong");
                    break;
                case "qty_asc":
                    sortObj = org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "soLuong");
                    break;
                default:
                    sortObj = org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "id");
            }
        }
        
        Pageable pageable = PageRequest.of(pageNo - 1, pageSize, sortObj);
        String kw = (keyword != null && !keyword.trim().isEmpty()) ? keyword.trim() : null;
        return sanPhamRepository.searchFilter(kw, idThuongHieu, idLoaiGiay, trangThai, pageable);
    }

    @Override
    public SanPham getById(Long id) {
        return sanPhamRepository.findById(id).orElse(null);
    }

    @Override
    public SanPham save(SanPham sanPham) {
        sanPham.setNgayTao(LocalDateTime.now());
        sanPham.setNgaySua(LocalDateTime.now());
        if(sanPham.getTrangThai() == null) {
            sanPham.setTrangThai(1); // 1 = Kinh doanh
        }
        return sanPhamRepository.save(sanPham);
    }

    @Override
    public SanPham update(Long id, SanPham sanPham) {
        Optional<SanPham> existingOpt = sanPhamRepository.findById(id);
        if(existingOpt.isPresent()) {
            SanPham existing = existingOpt.get();
            existing.setTenSanPham(sanPham.getTenSanPham());
            existing.setMaSanPham(sanPham.getMaSanPham());
            existing.setThuongHieu(sanPham.getThuongHieu());
            existing.setLoaiGiay(sanPham.getLoaiGiay());
            existing.setGiaNhap(sanPham.getGiaNhap());
            existing.setGiaBan(sanPham.getGiaBan());
            existing.setSoLuong(sanPham.getSoLuong());
            existing.setMoTaChiTiet(sanPham.getMoTaChiTiet());
            existing.setTrangThai(sanPham.getTrangThai());
            existing.setNgaySua(LocalDateTime.now());
            return sanPhamRepository.save(existing);
        }
        return null;
    }

    @Override
    public void delete(Long id) {
        sanPhamRepository.deleteById(id);
    }

    @Override
    public void toggleStatus(Long id) {
        Optional<SanPham> existingOpt = sanPhamRepository.findById(id);
        if(existingOpt.isPresent()) {
            SanPham existing = existingOpt.get();
            existing.setTrangThai(existing.getTrangThai() == 1 ? 0 : 1);
            sanPhamRepository.save(existing);
        }
    }
}
