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
        // Assume trangThai = 0 is Waiting
        return hoaDonRepository.findAll().stream()
                .filter(hd -> hd.getTrangThai() != null && hd.getTrangThai() == 0)
                .toList();
    }

    @Override
    @Transactional
    public HoaDon taoHoaDonCho() {
        HoaDon hd = new HoaDon();
        hd.setMaHoaDon("HD" + System.currentTimeMillis());
        hd.setLoaiHoaDon("TAI_QUAY");
        hd.setNgayTao(LocalDateTime.now());
        hd.setTrangThai(0); // 0 = Chờ thanh toán
        hd.setTongTienHang(BigDecimal.ZERO);
        hd.setTienGiamGia(BigDecimal.ZERO);
        hd.setTongTienThanhToan(BigDecimal.ZERO);
        return hoaDonRepository.save(hd);
    }

    @Override
    @Transactional
    public void huyHoaDonCho(Long id) {
        Optional<HoaDon> opt = hoaDonRepository.findById(id);
        if (opt.isPresent()) {
            HoaDon hd = opt.get();
            List<ChiTietHoaDon> chiTiets = getChiTietHoaDon(id);
            // Inventory is now deducted upon checkout, no need to restore here
            for (ChiTietHoaDon ct : chiTiets) {
                chiTietHoaDonRepository.delete(ct);
            }
            hoaDonRepository.delete(hd);
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
        
        int cartQty = 0;
        Optional<ChiTietHoaDon> existing = getChiTietHoaDon(idHoaDon).stream()
                .filter(ct -> ct.getSanPhamChiTiet().getId().equals(idSanPhamChiTiet))
                .findFirst();
        if (existing.isPresent()) {
            cartQty = existing.get().getSoLuong();
        }

        if (spct.getSoLuongTon() < (cartQty + soLuong)) {
            throw new RuntimeException("Số lượng tồn kho không đủ!");
        }

        ChiTietHoaDon ct;
        if (existing.isPresent()) {
            ct = existing.get();
            ct.setSoLuong(ct.getSoLuong() + soLuong);
            ct.setThanhTien(ct.getDonGia().multiply(new BigDecimal(ct.getSoLuong())));
        } else {
            ct = new ChiTietHoaDon();
            ct.setHoaDon(hd);
            ct.setSanPhamChiTiet(spct);
            ct.setSoLuong(soLuong);
            ct.setDonGia(spct.getGiaBan());
            ct.setThanhTien(spct.getGiaBan().multiply(new BigDecimal(soLuong)));
        }
        
        // Deduct inventory only on checkout


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
        
        // Deduct inventory only on checkout

        
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
        
        // Inventory restored only if cancelled, but here we don't deduct until checkout

        
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
        
        // Deduct inventory
        for (ChiTietHoaDon ct : chiTiets) {
            SanPhamChiTiet spct = ct.getSanPhamChiTiet();
            if (spct.getSoLuongTon() < ct.getSoLuong()) {
                throw new RuntimeException("Sản phẩm " + spct.getSanPham().getTenSanPham() + " không đủ số lượng tồn kho!");
            }
            spct.setSoLuongTon(spct.getSoLuongTon() - ct.getSoLuong());
            sanPhamChiTietRepository.save(spct);
        }

        hd.setTrangThai(1); // 1 = Đã thanh toán
        hd.setGhiChu(ghiChu);
        if (tenKhachHang != null && !tenKhachHang.trim().isEmpty()) {
            hd.setTenNguoiNhan(tenKhachHang);
        } else if (hd.getKhachHang() == null) {
            hd.setTenNguoiNhan("Khách lẻ");
        }
        
        // Cập nhật thông tin giao hàng
        if (phiShip != null && phiShip.compareTo(BigDecimal.ZERO) > 0) {
            hd.setTienVanChuyen(phiShip);
            hd.setTongTienThanhToan(hd.getTongTienThanhToan().add(phiShip)); // Cộng thêm phí ship vào tổng thanh toán
        }
        if (sdtNhan != null && !sdtNhan.trim().isEmpty()) {
            hd.setSdtNguoiNhan(sdtNhan);
        }
        if (diaChiGiao != null && !diaChiGiao.trim().isEmpty()) {
            hd.setDiaChiGiao(diaChiGiao);
            // Có thể đổi loại hóa đơn nếu có địa chỉ giao
            hd.setLoaiHoaDon("GIAO_HANG");
        }

        hd.setNgayCapNhat(LocalDateTime.now());
        // You would typically save Payment records here depending on your models
        
        return hoaDonRepository.save(hd);
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
