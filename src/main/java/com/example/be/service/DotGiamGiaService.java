package com.example.be.service;

import com.example.be.entity.DotGiamGia;
import com.example.be.repository.DotGiamGiaRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class DotGiamGiaService {

    private final DotGiamGiaRepository dotGiamGiaRepository;

    public DotGiamGiaService(DotGiamGiaRepository dotGiamGiaRepository) {
        this.dotGiamGiaRepository = dotGiamGiaRepository;
    }

    public List<DotGiamGia> search(String keyword, Integer trangThai) {
        if (keyword != null && keyword.trim().isEmpty()) {
            keyword = null;
        }
        return dotGiamGiaRepository.searchDotGiamGia(keyword, trangThai);
    }

    public Optional<DotGiamGia> findById(Long id) {
        return dotGiamGiaRepository.findById(id);
    }

    public DotGiamGia save(DotGiamGia dotGiamGia) {
        // Validate dates
        if (dotGiamGia.getNgayBatDau() != null && dotGiamGia.getNgayKetThuc() != null) {
            if (dotGiamGia.getNgayBatDau().isAfter(dotGiamGia.getNgayKetThuc())) {
                throw new RuntimeException("Ngày bắt đầu không được lớn hơn ngày kết thúc");
            }
        }
        
        // Validate discount percentage
        if (dotGiamGia.getPhanTramGiam() == null || dotGiamGia.getPhanTramGiam() < 1 || dotGiamGia.getPhanTramGiam() > 100) {
            throw new RuntimeException("Phần trăm giảm giá phải từ 1 đến 100");
        }

        return dotGiamGiaRepository.save(dotGiamGia);
    }

    public void deleteById(Long id) {
        dotGiamGiaRepository.deleteById(id);
    }

    public DotGiamGia toggleTrangThai(Long id) {
        DotGiamGia dgg = dotGiamGiaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đợt giảm giá với id: " + id));
        dgg.setTrangThai(dgg.getTrangThai() != null && dgg.getTrangThai() == 1 ? 0 : 1);
        return dotGiamGiaRepository.save(dgg);
    }
}
