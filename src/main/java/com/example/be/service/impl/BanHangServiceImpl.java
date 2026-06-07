package com.example.be.service.impl;

import com.example.be.entity.*;
import com.example.be.repository.*;
import com.example.be.service.BanHangService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class BanHangServiceImpl implements BanHangService {

    @Autowired
    private HoaDonRepository hoaDonRepository;

    @Autowired
    private ChiTietHoaDonRepository chiTietHoaDonRepository;

    @Autowired
    private SanPhamChiTietRepository sanPhamChiTietRepository;

    @Autowired
    private KhachHangRepository khachHangRepository;

    @Autowired
    private PhieuGiamGiaRepository phieuGiamGiaRepository;

    @Override
    public List<HoaDon> getDanhSachHoaDonCho() {
        return hoaDonRepository.findByTrangThaiAndLoaiHoaDonOrderByNgayTaoDesc(6, "Tại quầy");
    }

    @Override
    @Transactional
    public HoaDon taoHoaDonCho() {
        // Sinh mã hóa đơn tự động
        String maHoaDon = "HDTQ0001";
        Optional<HoaDon> lastHoaDon = hoaDonRepository.findFirstByMaHoaDonStartingWithOrderByMaHoaDonDesc("HDTQ");
        if (lastHoaDon.isPresent()) {
            String lastMa = lastHoaDon.get().getMaHoaDon();
            try {
                int number = Integer.parseInt(lastMa.substring(4));
                maHoaDon = String.format("HDTQ%04d", number + 1);
            } catch (NumberFormatException e) {
                // ignore
            }
        }

        HoaDon hoaDon = new HoaDon();
        hoaDon.setMaHoaDon(maHoaDon);
        hoaDon.setLoaiHoaDon("Tại quầy");
        hoaDon.setTrangThai(6); // 6 = Hóa đơn chờ
        hoaDon.setNgayTao(LocalDateTime.now());
        hoaDon.setTongTienHang(BigDecimal.ZERO);
        hoaDon.setTienGiamGia(BigDecimal.ZERO);
        hoaDon.setTongTienThanhToan(BigDecimal.ZERO);

        return hoaDonRepository.save(hoaDon);
    }

    @Override
    @Transactional
    public void huyHoaDonCho(Long idHoaDon) {
        Optional<HoaDon> optionalHoaDon = hoaDonRepository.findById(idHoaDon);
        if (optionalHoaDon.isPresent()) {
            HoaDon hoaDon = optionalHoaDon.get();
            // Hoàn lại số lượng cho sản phẩm
            List<ChiTietHoaDon> chiTietList = chiTietHoaDonRepository.findByHoaDonId(idHoaDon);
            for (ChiTietHoaDon ct : chiTietList) {
                SanPhamChiTiet spct = ct.getSanPhamChiTiet();
                spct.setSoLuongTon(spct.getSoLuongTon() + ct.getSoLuong());
                sanPhamChiTietRepository.save(spct);
            }
            // Hủy hóa đơn
            hoaDon.setTrangThai(5); // 5 = Đã hủy
            hoaDon.setLyDoHuy("Khách không mua nữa");
            hoaDon.setNgayCapNhat(LocalDateTime.now());
            hoaDonRepository.save(hoaDon);
        }
    }

    @Override
    public List<ChiTietHoaDon> getChiTietHoaDon(Long idHoaDon) {
        return chiTietHoaDonRepository.findByHoaDonId(idHoaDon);
    }

    @Override
    @Transactional
    public ChiTietHoaDon themSanPhamVaoHoaDon(Long idHoaDon, Long idSanPhamChiTiet, Integer soLuong) {
        HoaDon hoaDon = hoaDonRepository.findById(idHoaDon).orElseThrow(() -> new RuntimeException("Không tìm thấy hóa đơn"));
        SanPhamChiTiet spct = sanPhamChiTietRepository.findById(idSanPhamChiTiet).orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm"));

        if (spct.getSoLuongTon() < soLuong) {
            throw new RuntimeException("Số lượng tồn kho không đủ");
        }

        // Kiểm tra xem sản phẩm đã có trong hóa đơn chưa
        List<ChiTietHoaDon> chiTietList = chiTietHoaDonRepository.findByHoaDonId(idHoaDon);
        for (ChiTietHoaDon ct : chiTietList) {
            if (ct.getSanPhamChiTiet().getId().equals(idSanPhamChiTiet)) {
                // Nếu có rồi thì tăng số lượng
                ct.setSoLuong(ct.getSoLuong() + soLuong);
                ct.setThanhTien(ct.getDonGia().multiply(BigDecimal.valueOf(ct.getSoLuong())));
                ct.setNgayCapNhat(LocalDateTime.now());
                
                // Trừ tồn kho
                spct.setSoLuongTon(spct.getSoLuongTon() - soLuong);
                sanPhamChiTietRepository.save(spct);
                
                ChiTietHoaDon saved = chiTietHoaDonRepository.save(ct);
                capNhatTongTienHoaDon(idHoaDon);
                return saved;
            }
        }

        // Nếu chưa có thì tạo mới
        ChiTietHoaDon chiTiet = new ChiTietHoaDon();
        chiTiet.setHoaDon(hoaDon);
        chiTiet.setSanPhamChiTiet(spct);
        chiTiet.setSoLuong(soLuong);
        chiTiet.setDonGia(spct.getGiaBan());
        chiTiet.setThanhTien(spct.getGiaBan().multiply(BigDecimal.valueOf(soLuong)));
        chiTiet.setNgayTao(LocalDateTime.now());
        chiTiet.setTrangThai(1);

        // Trừ tồn kho
        spct.setSoLuongTon(spct.getSoLuongTon() - soLuong);
        sanPhamChiTietRepository.save(spct);

        ChiTietHoaDon saved = chiTietHoaDonRepository.save(chiTiet);
        capNhatTongTienHoaDon(idHoaDon);
        return saved;
    }

    @Override
    @Transactional
    public ChiTietHoaDon capNhatSoLuong(Long idChiTiet, Integer soLuong) {
        ChiTietHoaDon chiTiet = chiTietHoaDonRepository.findById(idChiTiet).orElseThrow(() -> new RuntimeException("Không tìm thấy chi tiết hóa đơn"));
        SanPhamChiTiet spct = chiTiet.getSanPhamChiTiet();

        int diff = soLuong - chiTiet.getSoLuong();
        if (diff > 0 && spct.getSoLuongTon() < diff) {
            throw new RuntimeException("Số lượng tồn kho không đủ");
        }

        // Cập nhật tồn kho
        spct.setSoLuongTon(spct.getSoLuongTon() - diff);
        sanPhamChiTietRepository.save(spct);

        chiTiet.setSoLuong(soLuong);
        chiTiet.setThanhTien(chiTiet.getDonGia().multiply(BigDecimal.valueOf(soLuong)));
        chiTiet.setNgayCapNhat(LocalDateTime.now());

        ChiTietHoaDon saved = chiTietHoaDonRepository.save(chiTiet);
        capNhatTongTienHoaDon(chiTiet.getHoaDon().getId());
        return saved;
    }

    @Override
    @Transactional
    public void xoaChiTiet(Long idChiTiet) {
        ChiTietHoaDon chiTiet = chiTietHoaDonRepository.findById(idChiTiet).orElseThrow(() -> new RuntimeException("Không tìm thấy chi tiết hóa đơn"));
        SanPhamChiTiet spct = chiTiet.getSanPhamChiTiet();
        
        // Hoàn lại tồn kho
        spct.setSoLuongTon(spct.getSoLuongTon() + chiTiet.getSoLuong());
        sanPhamChiTietRepository.save(spct);
        
        Long idHoaDon = chiTiet.getHoaDon().getId();
        chiTietHoaDonRepository.delete(chiTiet);
        capNhatTongTienHoaDon(idHoaDon);
    }

    @Override
    @Transactional
    public HoaDon capNhatKhachHang(Long idHoaDon, Long idKhachHang) {
        HoaDon hoaDon = hoaDonRepository.findById(idHoaDon).orElseThrow(() -> new RuntimeException("Không tìm thấy hóa đơn"));
        if (idKhachHang == null) {
            hoaDon.setKhachHang(null);
            hoaDon.setTenNguoiNhan(null);
            hoaDon.setSdtNguoiNhan(null);
        } else {
            KhachHang khachHang = khachHangRepository.findById(idKhachHang).orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng"));
            hoaDon.setKhachHang(khachHang);
            hoaDon.setTenNguoiNhan(khachHang.getHoTen());
            hoaDon.setSdtNguoiNhan(khachHang.getSoDienThoai());
        }
        return hoaDonRepository.save(hoaDon);
    }

    @Override
    @Transactional
    public HoaDon capNhatPhieuGiamGia(Long idHoaDon, Long idPhieuGiamGia) {
        HoaDon hoaDon = hoaDonRepository.findById(idHoaDon).orElseThrow(() -> new RuntimeException("Không tìm thấy hóa đơn"));
        if (idPhieuGiamGia == null) {
            hoaDon.setPhieuGiamGia(null);
            // Tính lại tổng thanh toán không có giảm giá
            hoaDon.setTienGiamGia(BigDecimal.ZERO);
            hoaDon.setTongTienThanhToan(hoaDon.getTongTienHang());
        } else {
            PhieuGiamGia pgg = phieuGiamGiaRepository.findById(idPhieuGiamGia).orElseThrow(() -> new RuntimeException("Không tìm thấy phiếu giảm giá"));
            
            // Validate phiếu giảm giá
            if (pgg.getTrangThai() != 1) {
                throw new RuntimeException("Phiếu giảm giá không khả dụng");
            }
            if (pgg.getNgayKetThuc() != null && pgg.getNgayKetThuc().isBefore(LocalDateTime.now())) {
                throw new RuntimeException("Phiếu giảm giá đã hết hạn");
            }
            if (pgg.getSoLuong() <= pgg.getSoLuongDaDung()) {
                throw new RuntimeException("Phiếu giảm giá đã hết số lượng");
            }
            if (hoaDon.getTongTienHang().compareTo(pgg.getDonToiThieu()) < 0) {
                throw new RuntimeException("Chưa đạt giá trị đơn tối thiểu: " + pgg.getDonToiThieu());
            }

            hoaDon.setPhieuGiamGia(pgg);
            
            // Tính tiền giảm
            BigDecimal tienGiam = BigDecimal.ZERO;
            if ("%".equals(pgg.getLoaiGiamGia())) {
                tienGiam = hoaDon.getTongTienHang().multiply(pgg.getGiaTriGiam()).divide(BigDecimal.valueOf(100));
                if (pgg.getGiamToiDa() != null && tienGiam.compareTo(pgg.getGiamToiDa()) > 0) {
                    tienGiam = pgg.getGiamToiDa();
                }
            } else {
                tienGiam = pgg.getGiaTriGiam();
            }
            
            hoaDon.setTienGiamGia(tienGiam);
            hoaDon.setTongTienThanhToan(hoaDon.getTongTienHang().subtract(tienGiam));
        }
        return hoaDonRepository.save(hoaDon);
    }

    @Override
    @Transactional
    public HoaDon thanhToan(Long idHoaDon, BigDecimal tongTienHang, BigDecimal tienGiamGia, BigDecimal tongTienThanhToan, String ghiChu) {
        HoaDon hoaDon = hoaDonRepository.findById(idHoaDon).orElseThrow(() -> new RuntimeException("Không tìm thấy hóa đơn"));
        
        hoaDon.setTongTienHang(tongTienHang);
        hoaDon.setTienGiamGia(tienGiamGia);
        hoaDon.setTongTienThanhToan(tongTienThanhToan);
        hoaDon.setGhiChu(ghiChu);
        hoaDon.setTrangThai(3); // 3 = Hoàn thành
        hoaDon.setNgayCapNhat(LocalDateTime.now());
        
        // Nếu có phiếu giảm giá thì tăng số lượng đã dùng
        if (hoaDon.getPhieuGiamGia() != null) {
            PhieuGiamGia pgg = hoaDon.getPhieuGiamGia();
            pgg.setSoLuongDaDung((pgg.getSoLuongDaDung() == null ? 0 : pgg.getSoLuongDaDung()) + 1);
            phieuGiamGiaRepository.save(pgg);
        }
        
        return hoaDonRepository.save(hoaDon);
    }

    private void capNhatTongTienHoaDon(Long idHoaDon) {
        HoaDon hoaDon = hoaDonRepository.findById(idHoaDon).orElseThrow();
        List<ChiTietHoaDon> chiTietList = chiTietHoaDonRepository.findByHoaDonId(idHoaDon);
        
        BigDecimal tongTien = BigDecimal.ZERO;
        for (ChiTietHoaDon ct : chiTietList) {
            tongTien = tongTien.add(ct.getThanhTien());
        }
        
        hoaDon.setTongTienHang(tongTien);
        
        // Cập nhật lại tiền giảm giá nếu có voucher
        if (hoaDon.getPhieuGiamGia() != null) {
            PhieuGiamGia pgg = hoaDon.getPhieuGiamGia();
            if (tongTien.compareTo(pgg.getDonToiThieu()) < 0) {
                // Mất điều kiện voucher -> gỡ bỏ
                hoaDon.setPhieuGiamGia(null);
                hoaDon.setTienGiamGia(BigDecimal.ZERO);
            } else {
                BigDecimal tienGiam = BigDecimal.ZERO;
                if ("%".equals(pgg.getLoaiGiamGia())) {
                    tienGiam = tongTien.multiply(pgg.getGiaTriGiam()).divide(BigDecimal.valueOf(100));
                    if (pgg.getGiamToiDa() != null && tienGiam.compareTo(pgg.getGiamToiDa()) > 0) {
                        tienGiam = pgg.getGiamToiDa();
                    }
                } else {
                    tienGiam = pgg.getGiaTriGiam();
                }
                hoaDon.setTienGiamGia(tienGiam);
            }
        }
        
        hoaDon.setTongTienThanhToan(tongTien.subtract(hoaDon.getTienGiamGia() != null ? hoaDon.getTienGiamGia() : BigDecimal.ZERO));
        hoaDonRepository.save(hoaDon);
    }
}
