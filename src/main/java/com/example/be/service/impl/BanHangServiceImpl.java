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
    private SanPhamRepository sanPhamRepository;

    @Autowired
    private KhachHangRepository khachHangRepository;

    @Autowired
    private PhieuGiamGiaRepository phieuGiamGiaRepository;

    @Autowired
    private ChiTietDotGiamGiaRepository chiTietDotGiamGiaRepository;

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
                    tinhTongTien(hd);
                })
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
                if (spct != null) {
                    int restoreQty = ct.getSoLuong();
                    spct.setSoLuongTon((spct.getSoLuongTon() == null ? 0 : spct.getSoLuongTon()) + restoreQty);
                    if (spct.getSanPham() != null) {
                        SanPham sp = spct.getSanPham();
                        sp.setSoLuong((sp.getSoLuong() == null ? 0 : sp.getSoLuong()) + restoreQty);
                        sanPhamRepository.save(sp);
                    }
                    sanPhamChiTietRepository.save(spct);
                }
                chiTietHoaDonRepository.delete(ct);
            }
            
            // Delete history records if any
            List<com.example.be.entity.LichSuHoaDon> histories = lichSuHoaDonRepository.findByHoaDonIdOrderByNgayTaoDesc(id);
            if (histories != null && !histories.isEmpty()) {
                lichSuHoaDonRepository.deleteAll(histories);
            }
            
            hoaDonRepository.delete(hd);
        }
    }

    @Override
    @Transactional
    public List<ChiTietHoaDon> getChiTietHoaDon(Long idHoaDon) {
        List<ChiTietHoaDon> list = chiTietHoaDonRepository.findAll().stream()
                .filter(ct -> ct.getHoaDon() != null && ct.getHoaDon().getId().equals(idHoaDon))
                .toList();
        
        boolean changed = false;
        List<ChiTietHoaDon> resultList = new java.util.ArrayList<>();
        
        for (ChiTietHoaDon ct : list) {
            SanPhamChiTiet spct = ct.getSanPhamChiTiet();
            if (spct != null) {
                // Check if product or variant is discontinued — giữ nguyên trong giỏ, KHÔNG xóa
                boolean ngungKinhDoanh = (spct.getTrangThai() == null || spct.getTrangThai() != 1) ||
                    (spct.getSanPham() != null && (spct.getSanPham().getTrangThai() == null || spct.getSanPham().getTrangThai() != 1));
                if (ngungKinhDoanh) {
                    resultList.add(ct); // Vẫn đưa vào danh sách để hiển thị cảnh báo ở UI
                    continue;
                }
                
                if (ct.getDonGia() == null) {
                    Integer discount = chiTietDotGiamGiaRepository.findMaxActiveDiscountBySanPhamChiTietId(spct.getId(), java.time.LocalDateTime.now());
                    BigDecimal giaBanThucTe = spct.getGiaBan();
                    if (discount != null && discount > 0 && discount <= 100) {
                        BigDecimal giam = giaBanThucTe.multiply(BigDecimal.valueOf(discount)).divide(BigDecimal.valueOf(100));
                        giaBanThucTe = giaBanThucTe.subtract(giam);
                    }
                    System.out.println("DEBUG POS: Setting initial donGia to " + giaBanThucTe);
                    ct.setDonGia(giaBanThucTe);
                    ct.setDonGiaGoc(spct.getGiaBan());
                    ct.setThanhTien(giaBanThucTe.multiply(new BigDecimal(ct.getSoLuong())));
                    chiTietHoaDonRepository.save(ct);
                    changed = true;
                } else if (ct.getDonGiaGoc() == null) {
                    ct.setDonGiaGoc(ct.getDonGia() != null ? ct.getDonGia() : spct.getGiaBan());
                    chiTietHoaDonRepository.save(ct);
                    changed = true;
                }
                
                if (ct.getThanhTien() == null || ct.getThanhTien().compareTo(ct.getDonGia().multiply(new BigDecimal(ct.getSoLuong()))) != 0) {
                    ct.setThanhTien(ct.getDonGia().multiply(new BigDecimal(ct.getSoLuong())));
                    chiTietHoaDonRepository.save(ct);
                    changed = true;
                }
                resultList.add(ct);
            }
        }
        
        if (changed) {
            HoaDon hd = hoaDonRepository.findById(idHoaDon).orElse(null);
            if (hd != null) tinhTongTien(hd);
        }
        
        return resultList;
    }

    @Override
    @Transactional
    public ChiTietHoaDon themSanPhamVaoHoaDon(Long idHoaDon, Long idSanPhamChiTiet, Integer soLuong) {
        HoaDon hd = hoaDonRepository.findById(idHoaDon).orElseThrow(() -> new RuntimeException("Không tìm thấy hóa đơn"));
        SanPhamChiTiet spct = sanPhamChiTietRepository.findById(idSanPhamChiTiet).orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm"));
        
        if (spct.getSoLuongTon() == null || spct.getSoLuongTon() < soLuong) {
            throw new RuntimeException("Số lượng tồn kho không đủ! (Chỉ còn " + (spct.getSoLuongTon() == null ? 0 : spct.getSoLuongTon()) + " sản phẩm)");
        }

        // Trừ số lượng tồn kho ngay khi thêm vào giỏ hàng
        spct.setSoLuongTon(spct.getSoLuongTon() - soLuong);
        sanPhamChiTietRepository.save(spct);

        if (spct.getSanPham() != null) {
            SanPham sp = spct.getSanPham();
            sp.setSoLuong((sp.getSoLuong() == null ? 0 : sp.getSoLuong()) - soLuong);
            sanPhamRepository.save(sp);
        }

        // Calculate current price and discount
        Integer discount = chiTietDotGiamGiaRepository.findMaxActiveDiscountBySanPhamChiTietId(idSanPhamChiTiet, java.time.LocalDateTime.now());
        BigDecimal giaBanThucTe = spct.getGiaBan();
        if (discount != null && discount > 0 && discount <= 100) {
            BigDecimal giam = giaBanThucTe.multiply(BigDecimal.valueOf(discount)).divide(BigDecimal.valueOf(100));
            giaBanThucTe = giaBanThucTe.subtract(giam);
        }
        
        final BigDecimal finalGiaBanThucTe = giaBanThucTe;
        final BigDecimal finalGiaBanGoc = spct.getGiaBan();

        // Check if item already exists in cart with exactly the same prices
        Optional<ChiTietHoaDon> existing = getChiTietHoaDon(idHoaDon).stream()
                .filter(ct -> ct.getSanPhamChiTiet() != null && ct.getSanPhamChiTiet().getId().equals(idSanPhamChiTiet))
                .filter(ct -> ct.getDonGia() != null && ct.getDonGia().compareTo(finalGiaBanThucTe) == 0)
                .filter(ct -> ct.getDonGiaGoc() != null && ct.getDonGiaGoc().compareTo(finalGiaBanGoc) == 0)
                .findFirst();

        ChiTietHoaDon ct;
        if (existing.isPresent()) {
            ct = existing.get();
            int newQty = ct.getSoLuong() + soLuong;
            ct.setSoLuong(newQty);
            // Giữ nguyên giá cũ khi cộng dồn số lượng
            ct.setThanhTien(ct.getDonGia().multiply(new BigDecimal(ct.getSoLuong())));
        } else {
            ct = new ChiTietHoaDon();
            ct.setHoaDon(hd);
            ct.setSanPhamChiTiet(spct);
            ct.setSoLuong(soLuong);
            ct.setDonGia(giaBanThucTe);
            ct.setDonGiaGoc(spct.getGiaBan());
            ct.setThanhTien(giaBanThucTe.multiply(new BigDecimal(soLuong)));
        }
        
        ct = chiTietHoaDonRepository.save(ct);
        tinhTongTien(hd);
        return ct;
    }

    @Override
    @Transactional
    public ChiTietHoaDon capNhatSoLuong(Long idChiTiet, Integer soLuong) {
        ChiTietHoaDon ct = chiTietHoaDonRepository.findById(idChiTiet).orElseThrow(() -> new RuntimeException("Không tìm thấy chi tiết hóa đơn"));
        SanPhamChiTiet spct = ct.getSanPhamChiTiet();
        
        int oldQty = ct.getSoLuong();
        int delta = soLuong - oldQty;
        
        if (delta > 0) {
            // Get current price
            Integer discount = chiTietDotGiamGiaRepository.findMaxActiveDiscountBySanPhamChiTietId(spct.getId(), java.time.LocalDateTime.now());
            BigDecimal giaBanThucTe = spct.getGiaBan();
            if (discount != null && discount > 0 && discount <= 100) {
                BigDecimal giam = giaBanThucTe.multiply(BigDecimal.valueOf(discount)).divide(BigDecimal.valueOf(100));
                giaBanThucTe = giaBanThucTe.subtract(giam);
            }
            
            // Check if price changed compared to this row's frozen price
            boolean priceChanged = false;
            if (ct.getDonGia() != null && giaBanThucTe.compareTo(ct.getDonGia()) != 0) {
                priceChanged = true;
            } else if (ct.getDonGiaGoc() != null && spct.getGiaBan().compareTo(ct.getDonGiaGoc()) != 0) {
                priceChanged = true;
            }
            
            if (priceChanged) {
                // Do not modify this row's quantity. Create a new row (or merge with another new row)
                themSanPhamVaoHoaDon(ct.getHoaDon().getId(), spct.getId(), delta);
                return ct; // Return original unmodified, UI will reload the whole cart anyway
            }
            
            if (spct.getSoLuongTon() == null || spct.getSoLuongTon() < delta) {
                throw new RuntimeException("Số lượng tồn kho không đủ! (Chỉ còn " + (spct.getSoLuongTon() == null ? 0 : spct.getSoLuongTon()) + " sản phẩm)");
            }
            spct.setSoLuongTon(spct.getSoLuongTon() - delta);
            if (spct.getSanPham() != null) {
                SanPham sp = spct.getSanPham();
                sp.setSoLuong((sp.getSoLuong() == null ? 0 : sp.getSoLuong()) - delta);
                sanPhamRepository.save(sp);
            }
            sanPhamChiTietRepository.save(spct);
            
            // Update this row's quantity using its frozen price
            ct.setSoLuong(soLuong);
            ct.setThanhTien(ct.getDonGia().multiply(new BigDecimal(soLuong)));
            ct = chiTietHoaDonRepository.save(ct);
            tinhTongTien(ct.getHoaDon());
            return ct;
            
        } else if (delta < 0) {
            int restoreQty = Math.abs(delta);
            spct.setSoLuongTon((spct.getSoLuongTon() == null ? 0 : spct.getSoLuongTon()) + restoreQty);
            if (spct.getSanPham() != null) {
                SanPham sp = spct.getSanPham();
                sp.setSoLuong((sp.getSoLuong() == null ? 0 : sp.getSoLuong()) + restoreQty);
                sanPhamRepository.save(sp);
            }
            sanPhamChiTietRepository.save(spct);
        }
        
        // Giữ nguyên giá cũ, chỉ cập nhật số lượng và thành tiền
        BigDecimal giaBanThucTe = ct.getDonGia();
        if (giaBanThucTe == null) {
            Integer discount = chiTietDotGiamGiaRepository.findMaxActiveDiscountBySanPhamChiTietId(spct.getId(), java.time.LocalDateTime.now());
            giaBanThucTe = spct.getGiaBan();
            if (discount != null && discount > 0 && discount <= 100) {
                BigDecimal giam = giaBanThucTe.multiply(BigDecimal.valueOf(discount)).divide(BigDecimal.valueOf(100));
                giaBanThucTe = giaBanThucTe.subtract(giam);
            }
        }
        
        ct.setSoLuong(soLuong);
        ct.setDonGia(giaBanThucTe);
        if (ct.getDonGiaGoc() == null) {
            ct.setDonGiaGoc(giaBanThucTe);
        }
        ct.setThanhTien(giaBanThucTe.multiply(new BigDecimal(soLuong)));
        ct = chiTietHoaDonRepository.save(ct);
        
        tinhTongTien(ct.getHoaDon());
        return ct;
    }

    @Override
    @Transactional
    public void xoaChiTiet(Long idChiTiet) {
        ChiTietHoaDon ct = chiTietHoaDonRepository.findById(idChiTiet).orElseThrow(() -> new RuntimeException("Không tìm thấy chi tiết hóa đơn"));
        SanPhamChiTiet spct = ct.getSanPhamChiTiet();
        
        if (spct != null) {
            int restoreQty = ct.getSoLuong();
            spct.setSoLuongTon((spct.getSoLuongTon() == null ? 0 : spct.getSoLuongTon()) + restoreQty);
            if (spct.getSanPham() != null) {
                SanPham sp = spct.getSanPham();
                sp.setSoLuong((sp.getSoLuong() == null ? 0 : sp.getSoLuong()) + restoreQty);
                sanPhamRepository.save(sp);
            }
            sanPhamChiTietRepository.save(spct);
        }
        
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
        tinhTongTien(hd);
        return hd;
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

        // Kiểm tra nếu có sản phẩm ngừng kinh doanh trong giỏ
        List<String> tenSanPhamNgung = new java.util.ArrayList<>();
        for (ChiTietHoaDon ct : chiTiets) {
            SanPhamChiTiet spct = ct.getSanPhamChiTiet();
            if (spct != null) {
                boolean ngungKinhDoanh = (spct.getTrangThai() == null || spct.getTrangThai() != 1) ||
                    (spct.getSanPham() != null && (spct.getSanPham().getTrangThai() == null || spct.getSanPham().getTrangThai() != 1));
                if (ngungKinhDoanh) {
                    String tenSP = (spct.getSanPham() != null ? spct.getSanPham().getTenSanPham() : spct.getMa());
                    tenSanPhamNgung.add(tenSP);
                }
            }
        }
        if (!tenSanPhamNgung.isEmpty()) {
            throw new RuntimeException("Giỏ hàng có sản phẩm ngừng kinh doanh: " + String.join(", ", tenSanPhamNgung) + ". Vui lòng xóa trước khi thanh toán.");
        }

        hd.setPhiShip(phiShip);
        hd.setSdtNguoiNhan(sdtNhan);
        hd.setDiaChiNhan(diaChiGiao);

        tinhTongTien(hd);
        hd.setTrangThai(1); // 1 = Đã thanh toán
        hd.setGhiChu(ghiChu);
        if (tenKhachHang != null && !tenKhachHang.trim().isEmpty()) {
            hd.setTenNguoiNhan(tenKhachHang);
        } else if (hd.getKhachHang() == null) {
            hd.setTenNguoiNhan("Khách lẻ");
        }

        hd.setNgayCapNhat(LocalDateTime.now());
        
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
            LocalDateTime now = LocalDateTime.now();
            boolean isValid = true;

            if (pgg.getTrangThai() == null || pgg.getTrangThai() != 1) {
                isValid = false;
            } else if (pgg.getNgayBatDau() != null && now.isBefore(pgg.getNgayBatDau())) {
                isValid = false;
            } else if (pgg.getNgayKetThuc() != null && now.isAfter(pgg.getNgayKetThuc())) {
                isValid = false;
            } else if (pgg.getSoLuong() != null && pgg.getSoLuongDaDung() != null && pgg.getSoLuongDaDung() >= pgg.getSoLuong()) {
                isValid = false;
            } else if (pgg.getDonToiThieu() != null && tongTienHang.compareTo(pgg.getDonToiThieu()) < 0) {
                isValid = false;
            }

            if (isValid) {
                String loai = pgg.getLoaiGiamGia();
                if (loai != null && ("1".equals(loai) || "%".equals(loai) || "Phần trăm".equalsIgnoreCase(loai) || "PERCENT".equalsIgnoreCase(loai))) { // %
                    tienGiamGia = tongTienHang.multiply(pgg.getGiaTriGiam()).divide(BigDecimal.valueOf(100));
                    if (pgg.getGiamToiDa() != null && tienGiamGia.compareTo(pgg.getGiamToiDa()) > 0) {
                        tienGiamGia = pgg.getGiamToiDa();
                    }
                } else { // VND
                    tienGiamGia = pgg.getGiaTriGiam() != null ? pgg.getGiaTriGiam() : BigDecimal.ZERO;
                }
            } else {
                hd.setPhieuGiamGia(null); // Invalidated: Tự động bỏ phiếu giảm giá!
            }
        }
        
        hd.setTienGiamGia(tienGiamGia);
        BigDecimal ship = hd.getPhiShip() != null ? hd.getPhiShip() : (hd.getTienVanChuyen() != null ? hd.getTienVanChuyen() : BigDecimal.ZERO);
        hd.setTongTienThanhToan(tongTienHang.add(ship).subtract(tienGiamGia).max(BigDecimal.ZERO));
        hoaDonRepository.save(hd);
    }
}
