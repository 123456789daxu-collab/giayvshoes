package com.example.be.service;

import com.example.be.dto.HoaDonDTO;
import com.example.be.entity.ChiTietHoaDon;
import com.example.be.entity.HoaDon;
import com.example.be.repository.ChiTietHoaDonRepository;
import com.example.be.repository.HoaDonRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class HoaDonService {

    private final HoaDonRepository hoaDonRepository;
    private final ChiTietHoaDonRepository chiTietHoaDonRepository;

    public HoaDonService(HoaDonRepository hoaDonRepository, ChiTietHoaDonRepository chiTietHoaDonRepository) {
        this.hoaDonRepository = hoaDonRepository;
        this.chiTietHoaDonRepository = chiTietHoaDonRepository;
    }

    public List<HoaDonDTO> search(String keyword, Integer trangThai, String loaiHoaDon, 
                                  BigDecimal minPrice, BigDecimal maxPrice, 
                                  LocalDateTime startDate, LocalDateTime endDate) {
        List<HoaDon> hoaDons = hoaDonRepository.searchHoaDon(
                keyword, trangThai, loaiHoaDon, minPrice, maxPrice, startDate, endDate);
                
        return hoaDons.stream().map(this::mapToDTO).collect(Collectors.toList());
    }
    
    private HoaDonDTO mapToDTO(HoaDon h) {
        List<ChiTietHoaDon> details = chiTietHoaDonRepository.findByHoaDonId(h.getId());
        int soLuong = details.stream()
                .mapToInt(d -> d.getSoLuong() != null ? d.getSoLuong() : 0)
                .sum();
                
        String tenKh = "";
        String sdtKh = "";
        if (h.getKhachHang() != null) {
            tenKh = h.getKhachHang().getHoTen();
            sdtKh = h.getKhachHang().getSoDienThoai();
        } else {
            tenKh = h.getTenNguoiNhan();
            sdtKh = h.getSdtNguoiNhan();
        }
        
        String nguoiTao = "";
        if (h.getNhanVien() != null) {
            nguoiTao = h.getNhanVien().getHoTen();
        } else if (h.getNguoiTao() != null) {
            nguoiTao = h.getNguoiTao();
        }

        return HoaDonDTO.builder()
                .id(h.getId())
                .maHoaDon(h.getMaHoaDon())
                .nguoiTao(nguoiTao)
                .tenKhachHang(tenKh)
                .sdtKhachHang(sdtKh)
                .soLuong(soLuong)
                .ngayTao(h.getNgayTao())
                .tongTien(h.getTongTienThanhToan())
                .loaiHoaDon(h.getLoaiHoaDon())
                .trangThai(h.getTrangThai())
                .build();
    }

    public java.util.Optional<HoaDonDTO> findById(Long id) {
        return hoaDonRepository.findById(id).map(this::mapToDTO);
    }

    public HoaDonDTO create(HoaDon hoaDon) {
        hoaDon.setNgayTao(LocalDateTime.now());
        if (hoaDon.getMaHoaDon() == null || hoaDon.getMaHoaDon().isEmpty()) {
            hoaDon.setMaHoaDon("HD" + System.currentTimeMillis());
        }
        HoaDon saved = hoaDonRepository.save(hoaDon);
        return mapToDTO(saved);
    }

    public java.util.Optional<HoaDonDTO> update(Long id, HoaDon hoaDonDetails) {
        return hoaDonRepository.findById(id).map(existing -> {
            existing.setTenNguoiNhan(hoaDonDetails.getTenNguoiNhan());
            existing.setSdtNguoiNhan(hoaDonDetails.getSdtNguoiNhan());
            existing.setLoaiHoaDon(hoaDonDetails.getLoaiHoaDon());
            existing.setTrangThai(hoaDonDetails.getTrangThai());
            existing.setTongTienThanhToan(hoaDonDetails.getTongTienThanhToan());
            existing.setGhiChu(hoaDonDetails.getGhiChu());
            existing.setNgayCapNhat(LocalDateTime.now());
            HoaDon updated = hoaDonRepository.save(existing);
            return mapToDTO(updated);
        });
    }

    public void delete(Long id) {
        hoaDonRepository.deleteById(id);
    }

    public void generateTestData() {
        if (hoaDonRepository.count() == 0) {
            for (int i = 1; i <= 5; i++) {
                HoaDon hd = HoaDon.builder()
                        .maHoaDon("HD_" + System.currentTimeMillis() + "_" + i)
                        .loaiHoaDon(i % 2 == 0 ? "Tại quầy" : "Online")
                        .tenNguoiNhan("Khách hàng Test " + i)
                        .sdtNguoiNhan("098765432" + i)
                        .tongTienThanhToan(new BigDecimal("350000").multiply(new BigDecimal(i)))
                        .trangThai(i % 3) // 0, 1, 2
                        .ngayTao(LocalDateTime.now().minusDays(i))
                        .nguoiTao("Nhân viên " + i)
                        .build();
                hoaDonRepository.save(hd);
            }
        }
    }
}
