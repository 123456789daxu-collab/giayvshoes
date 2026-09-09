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

    @Autowired
    private ChiTietDotGiamGiaRepository chiTietDotGiamGiaRepository;

    @Autowired
    private com.example.be.service.MaGeneratorService maGeneratorService;

    @Override
    public List<HoaDon> getDanhSachHoaDonCho() {
        // Assume trangThai = 0 is Waiting
        return hoaDonRepository.findAll().stream()
                .filter(hd -> hd.getTrangThai() != null && hd.getTrangThai() == 0)
                .filter(hd -> Boolean.FALSE.equals(hd.getLoaiHoaDon())) // Chỉ lấy hóa đơn Tại quầy
                .peek(hd -> {
                    BigDecimal tongTienHang = chiTietHoaDonRepository.findAll().stream()
                        .filter(ct -> ct.getHoaDon() != null && ct.getHoaDon().getId().equals(hd.getId()))
                        .map(ChiTietHoaDon::getThanhTien)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                    hd.setTongTienHang(tongTienHang);
                })
                .toList();
    }

    @Override
    @Transactional
    public HoaDon taoHoaDonCho() {
        HoaDon hd = new HoaDon();
        hd.setMaHoaDon(maGeneratorService.generateMaHoaDon());
        hd.setLoaiHoaDon("TAI_QUAY");
        hd.setNgayTao(LocalDateTime.now());
        hd.setTrangThai(0); // 0 = Chờ thanh toán
        hd.setTongTienHang(BigDecimal.ZERO);
        hd.setTienGiamGia(BigDecimal.ZERO);
        hd.setTongTienThanhToan(BigDecimal.ZERO);
        return hoaDonRepository.save(hd);
    }

    @Autowired
    private com.example.be.repository.LichSuHoaDonRepository lichSuHoaDonRepository;

    @Override
    @Transactional
    public void huyHoaDonCho(Long id) {
        Optional<HoaDon> opt = hoaDonRepository.findById(id);
        if (opt.isPresent()) {
            HoaDon hd = opt.get();
            // Restore inventory for items in cart before deleting
            List<ChiTietHoaDon> chiTiets = getChiTietHoaDon(id);
            for (ChiTietHoaDon ct : chiTiets) {
                SanPhamChiTiet spct = ct.getSanPhamChiTiet();
                spct.setSoLuongTon(spct.getSoLuongTon() + ct.getSoLuong());
                sanPhamChiTietRepository.save(spct);
                chiTietHoaDonRepository.delete(ct);
            }
            
            // KHONG DUNG XOA CUNG (CHUYEN TRANG THAI SANG DA HUY = 7)
            hd.setTrangThai(7);
            hoaDonRepository.save(hd);
            /*
            hoaDonRepository.delete(hd);
            */
        }
    }

    @Override
    public List<ChiTietHoaDon> getChiTietHoaDon(Long idHoaDon) {
        return chiTietHoaDonRepository.findAll().stream()
                .filter(ct -> ct.getHoaDon() != null && ct.getHoaDon().getId().equals(idHoaDon))
                .toList();
    }

    @Override
    @Transactional
    public ChiTietHoaDon themSanPhamVaoHoaDon(Long idHoaDon, Long idSanPhamChiTiet, Integer soLuong) {
        HoaDon hd = hoaDonRepository.findById(idHoaDon).orElseThrow(() -> new RuntimeException("Không tìm thấy hóa đơn"));
        SanPhamChiTiet spct = sanPhamChiTietRepository.findById(idSanPhamChiTiet).orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm"));
        
        if (spct.getSoLuongTon() < soLuong) {
            throw new RuntimeException("Số lượng tồn kho không đủ!");
        }

        // Check if item already exists in cart
        Optional<ChiTietHoaDon> existing = getChiTietHoaDon(idHoaDon).stream()
                .filter(ct -> ct.getSanPhamChiTiet().getId().equals(idSanPhamChiTiet))
                .findFirst();

        // Check active discount campaign
        Integer discount = chiTietDotGiamGiaRepository.findMaxActiveDiscountBySanPhamChiTietId(idSanPhamChiTiet, java.time.LocalDateTime.now());
        BigDecimal giaBanThucTe = spct.getGiaBan();
        if (discount != null && discount > 0 && discount <= 100) {
            BigDecimal giam = giaBanThucTe.multiply(BigDecimal.valueOf(discount)).divide(BigDecimal.valueOf(100));
            giaBanThucTe = giaBanThucTe.subtract(giam);
        }

        ChiTietHoaDon ct;
        if (existing.isPresent()) {
            ct = existing.get();
            ct.setSoLuong(ct.getSoLuong() + soLuong);
            ct.setDonGia(giaBanThucTe);
            ct.setThanhTien(giaBanThucTe.multiply(new BigDecimal(ct.getSoLuong())));
        } else {
            ct = new ChiTietHoaDon();
            ct.setHoaDon(hd);
            ct.setSanPhamChiTiet(spct);
            ct.setSoLuong(soLuong);
            ct.setDonGia(giaBanThucTe);
            ct.setThanhTien(giaBanThucTe.multiply(new BigDecimal(soLuong)));
        }
        
        // Deduct inventory immediately
        spct.setSoLuongTon(spct.getSoLuongTon() - soLuong);
        sanPhamChiTietRepository.save(spct);
        ct = chiTietHoaDonRepository.save(ct);
        tinhTongTien(hd);
        return ct;
    }

    @Override
    @Transactional
    public ChiTietHoaDon capNhatSoLuong(Long idChiTiet, Integer soLuong) {
        ChiTietHoaDon ct = chiTietHoaDonRepository.findById(idChiTiet).orElseThrow(() -> new RuntimeException("Không tìm thấy chi tiết hóa đơn"));
        SanPhamChiTiet spct = ct.getSanPhamChiTiet();
        
        int diff = soLuong - ct.getSoLuong();
        if (diff > 0 && spct.getSoLuongTon() < diff) {
            throw new RuntimeException("Số lượng tồn kho không đủ!");
        }
        
        // Deduct/Restore inventory based on diff
        spct.setSoLuongTon(spct.getSoLuongTon() - diff);
        sanPhamChiTietRepository.save(spct);        
        ct.setSoLuong(soLuong);
        ct.setThanhTien(ct.getDonGia().multiply(new BigDecimal(soLuong)));
        ct = chiTietHoaDonRepository.save(ct);
        
        tinhTongTien(ct.getHoaDon());
        return ct;
    }

    @Override
    @Transactional
    public void xoaChiTiet(Long idChiTiet) {
        ChiTietHoaDon ct = chiTietHoaDonRepository.findById(idChiTiet).orElseThrow(() -> new RuntimeException("Không tìm thấy chi tiết hóa đơn"));
        SanPhamChiTiet spct = ct.getSanPhamChiTiet();
        
        // Restore inventory
        spct.setSoLuongTon(spct.getSoLuongTon() + ct.getSoLuong());
        sanPhamChiTietRepository.save(spct);        
        HoaDon hd = ct.getHoaDon();
        chiTietHoaDonRepository.delete(ct);
        
        tinhTongTien(hd);
    }

    @Override
    @Transactional
    public HoaDon capNhatKhachHang(Long idHoaDon, Long idKhachHang) {
        HoaDon hd = hoaDonRepository.findById(idHoaDon).orElseThrow();
        if (idKhachHang != null) {
            KhachHang kh = khachHangRepository.findById(idKhachHang).orElseThrow();
            hd.setKhachHang(kh);
        } else {
            hd.setKhachHang(null);
        }
        return hoaDonRepository.save(hd);
    }

    @Override
    @Transactional
    public HoaDon capNhatPhieuGiamGia(Long idHoaDon, Long idPhieuGiamGia) {
        HoaDon hd = hoaDonRepository.findById(idHoaDon).orElseThrow();
        if (idPhieuGiamGia != null) {
            PhieuGiamGia pgg = phieuGiamGiaRepository.findById(idPhieuGiamGia).orElseThrow();
            hd.setPhieuGiamGia(pgg);
        } else {
            hd.setPhieuGiamGia(null);
        }
        tinhTongTien(hd);
        return hoaDonRepository.save(hd);
    }

    @Override
    @Transactional
    public HoaDon thanhToan(Long idHoaDon, String hinhThucThanhToan, BigDecimal tienKhachDua, String ghiChu, String tenKhachHang, BigDecimal phiShip, String sdtNhan, String diaChiGiao) {
        HoaDon hd = hoaDonRepository.findById(idHoaDon).orElseThrow(() -> new RuntimeException("Không tìm thấy hóa đơn"));
        
        List<ChiTietHoaDon> chiTiets = getChiTietHoaDon(idHoaDon);
        if (chiTiets.isEmpty()) {
            throw new RuntimeException("Giỏ hàng trống!");
        }

        // Kiểm tra có giao hàng hay nhận trực tiếp tại quầy
        boolean isGiaoHang = diaChiGiao != null && !diaChiGiao.trim().isEmpty();
        int targetStatus = isGiaoHang ? 1 : 6; // 1 = Đã xác nhận (chờ giao), 6 = Hoàn thành (khách mang về ngay)
        hd.setTrangThai(targetStatus);

        StringBuilder noteBuilder = new StringBuilder();
        if (ghiChu != null && !ghiChu.trim().isEmpty()) {
            noteBuilder.append(ghiChu.trim()).append(" | ");
        }
        noteBuilder.append("PTTT: ").append(hinhThucThanhToan != null ? hinhThucThanhToan : "CASH");
        if (isGiaoHang) {
            noteBuilder.append(" | [Đơn giao hàng tại quầy]");
        } else {
            noteBuilder.append(" | [Mua trực tiếp tại quầy]");
        }
        hd.setGhiChu(noteBuilder.toString());

        if (tenKhachHang != null && !tenKhachHang.trim().isEmpty()) {
            hd.setTenNguoiNhan(tenKhachHang);
        } else if (hd.getKhachHang() == null) {
            hd.setTenNguoiNhan("Khách lẻ");
        }
        
        // Shipping Details
        BigDecimal shipFee = (phiShip != null && phiShip.compareTo(BigDecimal.ZERO) > 0) ? phiShip : BigDecimal.ZERO;
        hd.setPhiShip(shipFee);
        hd.setSdtNguoiNhan(sdtNhan);
        hd.setDiaChiNhan(diaChiGiao);

        // Tính lại tổng tiền thanh toán = (tiền hàng - giảm giá) + phí ship
        BigDecimal tongHang = hd.getTongTienHang() != null ? hd.getTongTienHang() : BigDecimal.ZERO;
        BigDecimal giamGia = hd.getTienGiamGia() != null ? hd.getTienGiamGia() : BigDecimal.ZERO;
        BigDecimal finalTotal = tongHang.subtract(giamGia).max(BigDecimal.ZERO).add(shipFee);
        hd.setTongTienThanhToan(finalTotal);

        hd.setNgayCapNhat(LocalDateTime.now());
        HoaDon saved = hoaDonRepository.save(hd);

        // Ghi lịch sử hóa đơn để đồng bộ với Quản lý hóa đơn
        try {
            LichSuHoaDon history = LichSuHoaDon.builder()
                    .hoaDon(saved)
                    .hanhDong(isGiaoHang ? "Thanh toán & Đặt giao hàng" : "Thanh toán thành công tại quầy")
                    .ngayTao(LocalDateTime.now())
                    .ghiChu("Thanh toán đơn hàng " + saved.getMaHoaDon() + " (" + (isGiaoHang ? "Chờ đóng gói & giao hàng" : "Khách đã nhận hàng tại quầy") + ")")
                    .build();
            lichSuHoaDonRepository.save(history);
        } catch (Exception e) {
            System.err.println("Lỗi lưu lịch sử hóa đơn tại quầy: " + e.getMessage());
        }

        return saved;
    }

    private void tinhTongTien(HoaDon hd) {
        List<ChiTietHoaDon> chiTiets = getChiTietHoaDon(hd.getId());
        BigDecimal tongTienHang = chiTiets.stream()
                .map(ChiTietHoaDon::getThanhTien)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
                
        hd.setTongTienHang(tongTienHang);
        
        BigDecimal tienGiamGia = BigDecimal.ZERO;
        if (hd.getPhieuGiamGia() != null) {
            PhieuGiamGia pgg = hd.getPhieuGiamGia();
            if (pgg.getDonToiThieu() == null || tongTienHang.compareTo(pgg.getDonToiThieu()) >= 0) {
                if (pgg.getLoaiGiamGia() != null && ("1".equals(pgg.getLoaiGiamGia()) || "%".equals(pgg.getLoaiGiamGia()))) { // %
                    tienGiamGia = tongTienHang.multiply(pgg.getGiaTriGiam()).divide(BigDecimal.valueOf(100));
                    if (pgg.getGiamToiDa() != null && tienGiamGia.compareTo(pgg.getGiamToiDa()) > 0) {
                        tienGiamGia = pgg.getGiamToiDa();
                    }
                } else { // VND
                    tienGiamGia = pgg.getGiaTriGiam();
                }
            } else {
                hd.setPhieuGiamGia(null); // Invalidated
            }
        }
        
        hd.setTienGiamGia(tienGiamGia);
        hd.setTongTienThanhToan(tongTienHang.subtract(tienGiamGia).max(BigDecimal.ZERO));
        hoaDonRepository.save(hd);
    }
}
