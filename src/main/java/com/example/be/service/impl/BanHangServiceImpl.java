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

    @Autowired
    private DiaChiRepository diaChiRepository;

    @Autowired
    private SanPhamRepository sanPhamRepository;

    @Autowired
    private LichSuThanhToanRepository lichSuThanhToanRepository;

    @Override
    public List<HoaDon> getDanhSachHoaDonCho() {
        List<HoaDon> list = hoaDonRepository.findByTrangThaiAndLoaiHoaDonAndNgayThanhToanIsNull(0, false);
        for (HoaDon hd : list) {
            List<ChiTietHoaDon> details = chiTietHoaDonRepository.findByHoaDonId(hd.getId());
            BigDecimal tongTienHang = details.stream()
                    .map(ChiTietHoaDon::getThanhTien)
                    .filter(java.util.Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            hd.setTongTienHang(tongTienHang);
        }
        return list;
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

        try {
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof com.example.be.security.CustomUserDetails ud) {
                if (ud.getNhanVien() != null) {
                    hd.setNhanVien(ud.getNhanVien());
                }
            }
        } catch (Exception ignored) {}

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
                    spct.setSoLuongTon((spct.getSoLuongTon() != null ? spct.getSoLuongTon() : 0) + (ct.getSoLuong() != null ? ct.getSoLuong() : 0));
                    sanPhamChiTietRepository.save(spct);
                    if (spct.getSanPham() != null) {
                        syncTotalQuantity(spct.getSanPham().getId());
                    }
                }
                chiTietHoaDonRepository.delete(ct);
            }
            
            // Xóa lịch sử hóa đơn liên quan (nếu có)
            List<LichSuHoaDon> histories = lichSuHoaDonRepository.findByHoaDonIdOrderByNgayTaoDesc(id);
            if (histories != null && !histories.isEmpty()) {
                lichSuHoaDonRepository.deleteAll(histories);
            }

            // Xóa lịch sử thanh toán liên quan (nếu có)
            if (lichSuThanhToanRepository != null) {
                List<com.example.be.entity.LichSuThanhToan> lsttList = lichSuThanhToanRepository.findByHoaDonId(id);
                if (lsttList != null && !lsttList.isEmpty()) {
                    lichSuThanhToanRepository.deleteAll(lsttList);
                }
            }
            
            // Xóa hóa đơn chờ (tab POS) để không hiển thị trong danh sách hóa đơn
            hoaDonRepository.delete(hd);
        }
    }

    @Override
    public List<ChiTietHoaDon> getChiTietHoaDon(Long idHoaDon) {
        return chiTietHoaDonRepository.findByHoaDonId(idHoaDon);
    }

    @Override
    @Transactional
    public ChiTietHoaDon themSanPhamVaoHoaDon(Long idHoaDon, Long idSanPhamChiTiet, Integer soLuong) {
        HoaDon hd = hoaDonRepository.findById(idHoaDon).orElseThrow(() -> new RuntimeException("Không tìm thấy hóa đơn"));
        SanPhamChiTiet spct = sanPhamChiTietRepository.findById(idSanPhamChiTiet).orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm"));
        
        int tonKho = spct.getSoLuongTon() != null ? spct.getSoLuongTon() : 0;
        int slThem = (soLuong != null && soLuong > 0) ? soLuong : 1;
        if (tonKho < slThem) {
            throw new RuntimeException("Số lượng sản phẩm trong kho không đủ! (Kho chỉ còn " + tonKho + ", không thể mua/thêm " + slThem + ")");
        }

        // Check active discount campaign
        Integer discount = chiTietDotGiamGiaRepository.findMaxActiveDiscountBySanPhamChiTietId(idSanPhamChiTiet, java.time.LocalDateTime.now());
        BigDecimal giaGoc = spct.getGiaBan() != null ? spct.getGiaBan() : BigDecimal.ZERO;
        BigDecimal giaBanThucTe = giaGoc;
        if (discount != null && discount > 0 && discount <= 100) {
            BigDecimal giam = giaGoc.multiply(BigDecimal.valueOf(discount)).divide(BigDecimal.valueOf(100), 0, java.math.RoundingMode.HALF_UP);
            giaBanThucTe = giaGoc.subtract(giam);
        }

        // Check if item already exists in cart WITH SAME DON GIA
        BigDecimal finalGiaBanThucTe = giaBanThucTe;
        Optional<ChiTietHoaDon> existing = getChiTietHoaDon(idHoaDon).stream()
                .filter(ct -> ct.getSanPhamChiTiet() != null 
                        && ct.getSanPhamChiTiet().getId().equals(idSanPhamChiTiet)
                        && ct.getDonGia() != null 
                        && ct.getDonGia().compareTo(finalGiaBanThucTe) == 0)
                .findFirst();

        ChiTietHoaDon ct;
        if (existing.isPresent()) {
            ct = existing.get();
            int currentQty = ct.getSoLuong() != null ? ct.getSoLuong() : 0;
            ct.setSoLuong(currentQty + slThem);
            ct.setDonGiaGoc(giaGoc);
            ct.setDonGia(giaBanThucTe);
            ct.setThanhTien(giaBanThucTe.multiply(new BigDecimal(ct.getSoLuong())));
        } else {
            ct = new ChiTietHoaDon();
            ct.setHoaDon(hd);
            ct.setSanPhamChiTiet(spct);
            ct.setSoLuong(slThem);
            ct.setDonGiaGoc(giaGoc);
            ct.setDonGia(giaBanThucTe);
            ct.setThanhTien(giaBanThucTe.multiply(new BigDecimal(slThem)));
        }
        
        // Deduct inventory immediately
        spct.setSoLuongTon(tonKho - slThem);
        sanPhamChiTietRepository.save(spct);
        if (spct.getSanPham() != null) {
            syncTotalQuantity(spct.getSanPham().getId());
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
        
        // Calculate current active price
        BigDecimal giaGocHienTai = spct.getGiaBan() != null ? spct.getGiaBan() : BigDecimal.ZERO;
        Integer activeDiscount = chiTietDotGiamGiaRepository.findMaxActiveDiscountBySanPhamChiTietId(spct.getId(), java.time.LocalDateTime.now());
        BigDecimal giaHienTai = giaGocHienTai;
        if (activeDiscount != null && activeDiscount > 0 && activeDiscount <= 100) {
            BigDecimal giam = giaGocHienTai.multiply(BigDecimal.valueOf(activeDiscount)).divide(BigDecimal.valueOf(100), 0, java.math.RoundingMode.HALF_UP);
            giaHienTai = giaGocHienTai.subtract(giam);
        }
        
        if (ct.getDonGia() != null && giaHienTai.compareTo(ct.getDonGia()) != 0) {
            throw new RuntimeException("Giá sản phẩm đã thay đổi so với lúc thêm vào giỏ hàng, không thể thay đổi số lượng! Vui lòng xóa và thêm lại theo giá mới.");
        }
        
        int diff = soLuong - ct.getSoLuong();
        if (diff > 0 && spct.getSoLuongTon() < diff) {
            throw new RuntimeException("Số lượng tồn kho không đủ!");
        }
        
        // Deduct/Restore inventory based on diff
        spct.setSoLuongTon(spct.getSoLuongTon() - diff);
        sanPhamChiTietRepository.save(spct);        
        if (spct.getSanPham() != null) {
            syncTotalQuantity(spct.getSanPham().getId());
        }
        
        BigDecimal donGia = ct.getDonGia() != null ? ct.getDonGia() : (spct.getGiaBan() != null ? spct.getGiaBan() : BigDecimal.ZERO);
        ct.setSoLuong(soLuong);
        ct.setThanhTien(donGia.multiply(new BigDecimal(soLuong)));
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
        if (spct.getSanPham() != null) {
            syncTotalQuantity(spct.getSanPham().getId());
        }
        HoaDon hd = ct.getHoaDon();
        chiTietHoaDonRepository.delete(ct);
        
        tinhTongTien(hd);
    }

    private void syncTotalQuantity(Long sanPhamId) {
        if (sanPhamId == null) return;
        sanPhamRepository.findById(sanPhamId).ifPresent(sp -> {
            List<SanPhamChiTiet> variants = sanPhamChiTietRepository.findBySanPhamId(sanPhamId);
            int total = 0;
            BigDecimal minGiaBan = null;
            BigDecimal minGiaNhap = null;
            for (SanPhamChiTiet v : variants) {
                if (v.getSoLuongTon() != null && (v.getTrangThai() == null || v.getTrangThai() == 1)) {
                    total += v.getSoLuongTon();
                }
                if (v.getGiaBan() != null) {
                    if (minGiaBan == null || v.getGiaBan().compareTo(minGiaBan) < 0) {
                        minGiaBan = v.getGiaBan();
                    }
                }
                if (v.getGiaNhap() != null) {
                    if (minGiaNhap == null || v.getGiaNhap().compareTo(minGiaNhap) < 0) {
                        minGiaNhap = v.getGiaNhap();
                    }
                }
            }
            sp.setSoLuong(total);
            if (minGiaBan != null) sp.setGiaBan(minGiaBan);
            if (minGiaNhap != null) sp.setGiaNhap(minGiaNhap);
            sanPhamRepository.save(sp);
        });
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
        HoaDon hd = hoaDonRepository.findById(idHoaDon).orElseThrow(() -> new RuntimeException("Không tìm thấy hóa đơn"));
        if (idPhieuGiamGia != null) {
            PhieuGiamGia pgg = phieuGiamGiaRepository.findById(idPhieuGiamGia)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy phiếu giảm giá"));
            LocalDateTime now = LocalDateTime.now();
            if (pgg.getTrangThai() == null || pgg.getTrangThai() != 1) {
                throw new RuntimeException("Phiếu giảm giá đã ngừng hoạt động, không thể áp dụng!");
            }
            if (pgg.getNgayKetThuc() != null && now.isAfter(pgg.getNgayKetThuc())) {
                throw new RuntimeException("Phiếu giảm giá đã hết hạn, không thể áp dụng!");
            }
            if (pgg.getNgayBatDau() != null && now.isBefore(pgg.getNgayBatDau())) {
                throw new RuntimeException("Phiếu giảm giá chưa đến thời gian áp dụng!");
            }
            if (pgg.getSoLuong() != null && pgg.getSoLuongDaDung() != null && pgg.getSoLuongDaDung() >= pgg.getSoLuong()) {
                throw new RuntimeException("Phiếu giảm giá đã hết lượt sử dụng!");
            }
            hd.setPhieuGiamGia(pgg);
        } else {
            hd.setPhieuGiamGia(null);
        }
        tinhTongTien(hd);
        return hoaDonRepository.save(hd);
    }

    @Override
    @Transactional
    public HoaDon capNhatGiaoHang(Long idHoaDon, Boolean isGiaoHang, String tenNguoiNhan, String sdtNhan, String diaChiGiao, BigDecimal phiShip) {
        HoaDon hd = hoaDonRepository.findById(idHoaDon).orElseThrow(() -> new RuntimeException("Không tìm thấy hóa đơn"));
        if (Boolean.TRUE.equals(isGiaoHang)) {
            hd.setTenNguoiNhan(tenNguoiNhan);
            hd.setSdtNguoiNhan(sdtNhan);
            hd.setDiaChiNhan(diaChiGiao);
            hd.setPhiShip(phiShip != null ? phiShip : BigDecimal.ZERO);
        } else {
            hd.setTenNguoiNhan(null);
            hd.setSdtNguoiNhan(null);
            hd.setDiaChiNhan(null);
            hd.setPhiShip(BigDecimal.ZERO);
        }
        tinhTongTien(hd);
        return hoaDonRepository.save(hd);
    }

    @Override
    @Transactional
    public HoaDon thanhToan(Long idHoaDon, String hinhThucThanhToan, BigDecimal tienKhachDua, String ghiChu, String tenKhachHang, BigDecimal phiShip, String sdtNhan, String diaChiGiao) {
        return thanhToan(idHoaDon, hinhThucThanhToan, tienKhachDua, ghiChu, tenKhachHang, phiShip, sdtNhan, diaChiGiao, null);
    }

    @Override
    @Transactional
    public HoaDon thanhToan(Long idHoaDon, String hinhThucThanhToan, BigDecimal tienKhachDua, String ghiChu, String tenKhachHang, BigDecimal phiShip, String sdtNhan, String diaChiGiao, Long idPhieuGiamGia) {
        HoaDon hd = hoaDonRepository.findById(idHoaDon).orElseThrow(() -> new RuntimeException("Không tìm thấy hóa đơn"));
        
        List<ChiTietHoaDon> chiTiets = getChiTietHoaDon(idHoaDon);
        if (chiTiets.isEmpty()) {
            throw new RuntimeException("Giỏ hàng trống!");
        }

        // Kiểm tra từng sản phẩm trong giỏ hàng xem có sản phẩm ngừng kinh doanh không
        for (ChiTietHoaDon ct : chiTiets) {
            SanPhamChiTiet spct = ct.getSanPhamChiTiet();
            if (spct != null) {
                boolean isProductActive = (spct.getSanPham() == null || spct.getSanPham().getTrangThai() == null || spct.getSanPham().getTrangThai() == 1);
                boolean isVariantActive = (spct.getTrangThai() == null || spct.getTrangThai() == 1);
                if (!isProductActive || !isVariantActive) {
                    String tenSp = spct.getSanPham() != null ? spct.getSanPham().getTenSanPham() : "Sản phẩm";
                    throw new RuntimeException("Sản phẩm '" + tenSp + "' đã ngừng kinh doanh.");
                }
            }
        }

        // Kiểm tra phiếu giảm giá
        Long effectiveVoucherId = idPhieuGiamGia;
        if (effectiveVoucherId == null && hd.getPhieuGiamGia() != null) {
            effectiveVoucherId = hd.getPhieuGiamGia().getId();
        }

        if (effectiveVoucherId != null) {
            PhieuGiamGia pgg = phieuGiamGiaRepository.findById(effectiveVoucherId).orElse(null);
            LocalDateTime now = LocalDateTime.now();
            boolean voucherInvalid = false;

            if (pgg == null) {
                voucherInvalid = true;
            } else if (pgg.getTrangThai() == null || pgg.getTrangThai() != 1) {
                voucherInvalid = true;
            } else if (pgg.getNgayKetThuc() != null && now.isAfter(pgg.getNgayKetThuc())) {
                voucherInvalid = true;
            } else if (pgg.getNgayBatDau() != null && now.isBefore(pgg.getNgayBatDau())) {
                voucherInvalid = true;
            } else if (pgg.getSoLuong() != null && pgg.getSoLuongDaDung() != null && pgg.getSoLuongDaDung() >= pgg.getSoLuong()) {
                voucherInvalid = true;
            } else if (hd.getTongTienHang() != null && pgg.getDonToiThieu() != null
                    && hd.getTongTienHang().compareTo(pgg.getDonToiThieu()) < 0) {
                voucherInvalid = true;
            }

            if (voucherInvalid) {
                // Tự động gỡ phiếu không hợp lệ và tiếp tục thanh toán không giảm giá
                // (Frontend đã kiểm tra và thông báo người dùng rồi)
                hd.setPhieuGiamGia(null);
                hd.setTienGiamGia(BigDecimal.ZERO);
                tinhTongTien(hd);
                hoaDonRepository.save(hd);
                effectiveVoucherId = null;
                pgg = null; // Không áp dụng phiếu nào
            }

            if (pgg != null) {
                hd.setPhieuGiamGia(pgg);
            }
        } else {
            hd.setPhieuGiamGia(null);
            hd.setTienGiamGia(BigDecimal.ZERO);
        }

        // Tính lại tổng tiền hàng & giảm giá trước khi chốt đơn
        tinhTongTien(hd);

        // Kiểm tra có giao hàng hay nhận trực tiếp tại quầy
        boolean isGiaoHang = (diaChiGiao != null && !diaChiGiao.trim().isEmpty())
                || (hd.getDiaChiNhan() != null && !hd.getDiaChiNhan().trim().isEmpty());
        int targetStatus = isGiaoHang ? 0 : 6; // 0 = Chờ xác nhận (đơn giao hàng tại quầy), 6 = Hoàn thành (khách mang về ngay tại quầy)
        hd.setTrangThai(targetStatus);

        boolean isTransfer = "TRANSFER".equalsIgnoreCase(hinhThucThanhToan) || "CHUYEN_KHOAN".equalsIgnoreCase(hinhThucThanhToan);

        StringBuilder noteBuilder = new StringBuilder();
        if (ghiChu != null && !ghiChu.trim().isEmpty()) {
            noteBuilder.append(ghiChu.trim()).append(" | ");
        }
        noteBuilder.append("PTTT: ").append(isTransfer ? "TRANSFER" : "CASH");
        if (isTransfer) {
            noteBuilder.append(" | [Thanh toán chuyển khoản qua VietQR]");
        }
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
        hd.setTongTien(finalTotal);

        LocalDateTime now = LocalDateTime.now();
        hd.setNgayTao(now);
        hd.setNgayThanhToan(now);
        hd.setNgayCapNhat(now);
        HoaDon saved = hoaDonRepository.save(hd);

        // Tăng số lượng đã dùng của phiếu giảm giá khi thanh toán thành công
        if (saved.getPhieuGiamGia() != null && saved.getPhieuGiamGia().getId() != null) {
            try {
                phieuGiamGiaRepository.findById(saved.getPhieuGiamGia().getId()).ifPresent(p -> {
                    p.setSoLuongDaDung((p.getSoLuongDaDung() != null ? p.getSoLuongDaDung() : 0) + 1);
                    phieuGiamGiaRepository.save(p);
                });
            } catch (Exception e) {
                System.err.println("Lỗi cập nhật số lượng đã dùng của phiếu giảm giá: " + e.getMessage());
            }
        }

        // Ghi lịch sử thanh toán
        try {
            LichSuThanhToan lstt = LichSuThanhToan.builder()
                    .hoaDon(saved)
                    .soTien(finalTotal)
                    .phuongThucThanhToan(isTransfer ? "Chuyển khoản (VietQR)" : "Tiền mặt")
                    .trangThaiThanhToan(1)
                    .ngayThanhToan(now)
                    .ghiChu(isTransfer ? "Thanh toán chuyển khoản tại quầy qua VietQR" : "Thanh toán tiền mặt tại quầy")
                    .build();
            lichSuThanhToanRepository.save(lstt);
        } catch (Exception e) {
            System.err.println("Lỗi lưu lịch sử thanh toán tại quầy: " + e.getMessage());
        }

        // Ghi lịch sử hóa đơn để đồng bộ với Quản lý hóa đơn
        try {
            LichSuHoaDon history = LichSuHoaDon.builder()
                    .hoaDon(saved)
                    .hanhDong(isGiaoHang ? "Tạo đơn hàng & Chờ xác nhận" : "Thanh toán thành công tại quầy")
                    .ngayTao(LocalDateTime.now())
                    .ghiChu("Thanh toán đơn hàng " + saved.getMaHoaDon() + " (" + (isGiaoHang ? "Chờ xác nhận & giao hàng" : "Khách đã nhận hàng tại quầy") + ")")
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
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
                
        hd.setTongTienHang(tongTienHang);
        
        BigDecimal tienGiamGia = BigDecimal.ZERO;
        LocalDateTime now = LocalDateTime.now();

        if (hd.getPhieuGiamGia() != null && hd.getPhieuGiamGia().getId() != null) {
            PhieuGiamGia pgg = phieuGiamGiaRepository.findById(hd.getPhieuGiamGia().getId()).orElse(null);
            boolean isPggValid = pgg != null
                    && (pgg.getTrangThai() != null && pgg.getTrangThai() == 1)
                    && (pgg.getNgayBatDau() == null || !now.isBefore(pgg.getNgayBatDau()))
                    && (pgg.getNgayKetThuc() == null || !now.isAfter(pgg.getNgayKetThuc()))
                    && (pgg.getSoLuong() == null || pgg.getSoLuongDaDung() == null || pgg.getSoLuongDaDung() < pgg.getSoLuong());

            BigDecimal donToiThieu = (pgg != null && pgg.getDonToiThieu() != null) ? pgg.getDonToiThieu() : BigDecimal.ZERO;
            if (isPggValid && tongTienHang.compareTo(donToiThieu) >= 0) {
                String loai = pgg.getLoaiGiamGia() != null ? pgg.getLoaiGiamGia().trim().toLowerCase() : "";
                if ("1".equals(loai) || "%".equals(loai) || loai.contains("trăm") || loai.contains("tram") || "percent".equals(loai)) { // %
                    BigDecimal rate = pgg.getGiaTriGiam() != null ? pgg.getGiaTriGiam() : BigDecimal.ZERO;
                    tienGiamGia = tongTienHang.multiply(rate).divide(BigDecimal.valueOf(100), 0, java.math.RoundingMode.HALF_UP);
                    if (pgg.getGiamToiDa() != null && tienGiamGia.compareTo(pgg.getGiamToiDa()) > 0) {
                        tienGiamGia = pgg.getGiamToiDa();
                    }
                } else { // VND / Tiền mặt
                    tienGiamGia = pgg.getGiaTriGiam() != null ? pgg.getGiaTriGiam() : BigDecimal.ZERO;
                    if (tienGiamGia.compareTo(tongTienHang) > 0) {
                        tienGiamGia = tongTienHang;
                    }
                }
                hd.setPhieuGiamGia(pgg);
            } else {
                hd.setPhieuGiamGia(null);
                tienGiamGia = BigDecimal.ZERO;
            }
        }
        
        hd.setTienGiamGia(tienGiamGia);
        BigDecimal ship = hd.getPhiShip() != null ? hd.getPhiShip() : BigDecimal.ZERO;
        hd.setTongTienThanhToan(tongTienHang.subtract(tienGiamGia).max(BigDecimal.ZERO).add(ship));
        hoaDonRepository.save(hd);
    }

    @Override
    public java.util.List<java.util.Map<String, Object>> getDanhSachKhachHang(String keyword) {
        java.util.List<KhachHang> list = khachHangRepository.findAll();
        String kw = keyword != null ? keyword.trim().toLowerCase() : "";
        return list.stream()
                .filter(kh -> kw.isEmpty() || 
                              (kh.getHoTen() != null && kh.getHoTen().toLowerCase().contains(kw)) ||
                              (kh.getSoDienThoai() != null && kh.getSoDienThoai().contains(kw)))
                .map(kh -> {
                    java.util.Map<String, Object> map = new java.util.HashMap<>();
                    map.put("id", kh.getId());
                    map.put("hoTen", kh.getHoTen());
                    map.put("soDienThoai", kh.getSoDienThoai());
                    map.put("email", kh.getEmail());
                    
                    diaChiRepository.findByKhachHangIdAndMacDinhTrue(kh.getId()).ifPresent(diaChi -> {
                        String dcFull = "";
                        if (diaChi.getDiaChiChiTiet() != null) dcFull += diaChi.getDiaChiChiTiet();
                        if (diaChi.getPhuongXa() != null) dcFull += ", " + diaChi.getPhuongXa();
                        if (diaChi.getQuanHuyen() != null) dcFull += ", " + diaChi.getQuanHuyen();
                        if (diaChi.getTinhThanh() != null) dcFull += ", " + diaChi.getTinhThanh();
                        map.put("diaChiGiao", dcFull);
                        map.put("sdtNhan", diaChi.getSdt() != null ? diaChi.getSdt() : kh.getSoDienThoai());
                    });
                    
                    return map;
                })
                .collect(java.util.stream.Collectors.toList());
    }

    @Override
    public java.util.List<java.util.Map<String, Object>> getDanhSachSanPhamBanHang(String keyword) {
        java.util.List<SanPhamChiTiet> list = sanPhamChiTietRepository.searchForSale(
                keyword == null || keyword.isBlank() ? null : keyword.trim()
        );
        java.util.List<java.util.Map<String, Object>> result = new java.util.ArrayList<>();
        for (SanPhamChiTiet spct : list) {
            java.util.Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", spct.getId());
            map.put("ma", spct.getMa());
            map.put("maSanPhamChiTiet", spct.getMa());
            map.put("tenSanPham", spct.getSanPham() != null ? spct.getSanPham().getTenSanPham() : "");
            map.put("mauSac", spct.getMauSac() != null ? spct.getMauSac().getTenMauSac() : "");
            map.put("tenMauSac", spct.getMauSac() != null ? spct.getMauSac().getTenMauSac() : "");
            map.put("size", spct.getCoGiay() != null ? String.valueOf(spct.getCoGiay().getSizeGiay()) : "");
            map.put("sizeGiay", spct.getCoGiay() != null ? spct.getCoGiay().getSizeGiay() : "");
            map.put("thuongHieu", spct.getSanPham() != null && spct.getSanPham().getThuongHieu() != null ? spct.getSanPham().getThuongHieu().getTenThuongHieu() : "");
            map.put("danhMuc", spct.getSanPham() != null && spct.getSanPham().getDanhMuc() != null ? spct.getSanPham().getDanhMuc().getTenDanhMuc() : "");
            map.put("soLuongTon", spct.getSoLuongTon());
            map.put("giaGoc", spct.getGiaBan());

            Integer discount = chiTietDotGiamGiaRepository.findMaxActiveDiscountBySanPhamChiTietId(spct.getId(), java.time.LocalDateTime.now());
            if (discount != null && discount > 0) {
                BigDecimal multiplier = BigDecimal.valueOf(100 - discount).divide(BigDecimal.valueOf(100), 10, java.math.RoundingMode.HALF_UP);
                BigDecimal giaSauGiam = spct.getGiaBan() != null ? spct.getGiaBan().multiply(multiplier).setScale(0, java.math.RoundingMode.HALF_UP) : BigDecimal.ZERO;
                map.put("phanTramGiam", discount);
                map.put("giaSauGiam", giaSauGiam);
                map.put("giaBan", giaSauGiam);
            } else {
                map.put("phanTramGiam", 0);
                map.put("giaSauGiam", spct.getGiaBan());
                map.put("giaBan", spct.getGiaBan());
            }

            // Image URL
            String imgUrl = null;
            if (spct.getDanhSachHinhAnh() != null && !spct.getDanhSachHinhAnh().isEmpty()) {
                imgUrl = spct.getDanhSachHinhAnh().get(0);
            } else if (spct.getHinhAnh() != null && !spct.getHinhAnh().isBlank()) {
                imgUrl = spct.getHinhAnh().split(",")[0].trim();
            }
            map.put("hinhAnh", imgUrl);

            boolean isStopped = (spct.getTrangThai() != null && spct.getTrangThai() != 1) ||
                    (spct.getSanPham() != null && (spct.getSanPham().getTrangThai() != null && spct.getSanPham().getTrangThai() != 1));
            map.put("isStopped", isStopped);
            map.put("trangThai", spct.getTrangThai() != null ? spct.getTrangThai() : 1);
            if (spct.getSanPham() != null) {
                map.put("trangThaiSanPham", spct.getSanPham().getTrangThai() != null ? spct.getSanPham().getTrangThai() : 1);
            } else {
                map.put("trangThaiSanPham", 1);
            }

            result.add(map);
        }
        return result;
    }

    @Override
    public java.util.Map<String, Object> getHoaDonChiTietResponse(Long idHoaDon) {
        HoaDon hd = hoaDonRepository.findById(idHoaDon).orElse(null);
        if (hd == null) return null;

        tinhTongTien(hd);

        java.util.Map<String, Object> map = new java.util.HashMap<>();
        map.put("id", hd.getId());
        map.put("maHoaDon", hd.getMaHoaDon());
        map.put("tongTienHang", hd.getTongTienHang());
        map.put("tienGiamGia", hd.getTienGiamGia());
        map.put("tongTienThanhToan", hd.getTongTienThanhToan());
        map.put("tenNguoiNhan", hd.getTenNguoiNhan());
        map.put("sdtNhan", hd.getSdtNguoiNhan());
        map.put("diaChiGiao", hd.getDiaChiNhan());
        map.put("phiShip", hd.getPhiShip());

        if (hd.getKhachHang() != null) {
            java.util.Map<String, Object> khMap = new java.util.HashMap<>();
            khMap.put("id", hd.getKhachHang().getId());
            khMap.put("hoTen", hd.getKhachHang().getHoTen());
            khMap.put("soDienThoai", hd.getKhachHang().getSoDienThoai());
            map.put("khachHang", khMap);
        }

        if (hd.getPhieuGiamGia() != null) {
            java.util.Map<String, Object> pggMap = new java.util.HashMap<>();
            pggMap.put("id", hd.getPhieuGiamGia().getId());
            pggMap.put("maVoucher", hd.getPhieuGiamGia().getMaVoucher());
            pggMap.put("tenVoucher", hd.getPhieuGiamGia().getTenVoucher());
            pggMap.put("loaiGiamGia", hd.getPhieuGiamGia().getLoaiGiamGia());
            pggMap.put("giaTriGiam", hd.getPhieuGiamGia().getGiaTriGiam());
            pggMap.put("donToiThieu", hd.getPhieuGiamGia().getDonToiThieu());
            pggMap.put("giamToiDa", hd.getPhieuGiamGia().getGiamToiDa());
            map.put("phieuGiamGia", pggMap);
        }

        List<ChiTietHoaDon> list = getChiTietHoaDon(idHoaDon);
        List<java.util.Map<String, Object>> cart = list.stream().map(ct -> {
            java.util.Map<String, Object> item = new java.util.HashMap<>();
            item.put("id", ct.getId());
            item.put("soLuong", ct.getSoLuong());
            item.put("donGia", ct.getDonGia());
            item.put("donGiaGoc", ct.getDonGiaGoc());
            item.put("thanhTien", ct.getThanhTien());

            if (ct.getSanPhamChiTiet() != null) {
                SanPhamChiTiet spct = ct.getSanPhamChiTiet();
                item.put("idSanPhamChiTiet", spct.getId());
                item.put("maSanPham", spct.getMa());
                item.put("tenSanPham", spct.getSanPham() != null ? spct.getSanPham().getTenSanPham() : "");
                item.put("mauSac", spct.getMauSac() != null ? spct.getMauSac().getTenMauSac() : "");
                item.put("size", spct.getCoGiay() != null ? spct.getCoGiay().getSizeGiay() : "");
                item.put("soLuongTon", spct.getSoLuongTon() != null ? spct.getSoLuongTon() : 0);

                String imgUrl = null;
                if (spct.getDanhSachHinhAnh() != null && !spct.getDanhSachHinhAnh().isEmpty()) {
                    imgUrl = spct.getDanhSachHinhAnh().get(0);
                } else if (spct.getHinhAnh() != null && !spct.getHinhAnh().isBlank()) {
                    imgUrl = spct.getHinhAnh().split(",")[0].trim();
                }
                item.put("hinhAnh", imgUrl);

                boolean isStopped = (spct.getTrangThai() != null && spct.getTrangThai() != 1) ||
                        (spct.getSanPham() != null && (spct.getSanPham().getTrangThai() != null && spct.getSanPham().getTrangThai() != 1));
                item.put("isStopped", isStopped);

                BigDecimal giaBanGoc = ct.getDonGiaGoc() != null ? ct.getDonGiaGoc() : (spct.getGiaBan() != null ? spct.getGiaBan() : ct.getDonGia());
                item.put("giaBanGoc", giaBanGoc);
                item.put("donGiaGoc", giaBanGoc);

                int phanTramGiam = 0;
                if (giaBanGoc != null && ct.getDonGia() != null && giaBanGoc.compareTo(ct.getDonGia()) > 0 && giaBanGoc.compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal diff = giaBanGoc.subtract(ct.getDonGia());
                    BigDecimal phanTram = diff.multiply(new BigDecimal("100")).divide(giaBanGoc, 0, java.math.RoundingMode.HALF_UP);
                    phanTramGiam = phanTram.intValue();
                }
                item.put("phanTramGiam", phanTramGiam);

                if (spct.getGiaBan() != null) {
                    BigDecimal giaHienTai = spct.getGiaBan();
                    Integer activeDiscount = chiTietDotGiamGiaRepository.findMaxActiveDiscountBySanPhamChiTietId(spct.getId(), java.time.LocalDateTime.now());
                    if (activeDiscount != null && activeDiscount > 0 && activeDiscount <= 100) {
                        BigDecimal giam = giaHienTai.multiply(BigDecimal.valueOf(activeDiscount)).divide(BigDecimal.valueOf(100), 0, java.math.RoundingMode.HALF_UP);
                        giaHienTai = giaHienTai.subtract(giam);
                    }
                    item.put("giaHienTai", giaHienTai);
                    boolean daDoiGia = ct.getDonGia() != null && giaHienTai.compareTo(ct.getDonGia()) != 0;
                    item.put("daDoiGia", daDoiGia);
                }
            }
            return item;
        }).toList();

        map.put("cart", cart);
        int totalQty = cart.stream()
                .mapToInt(item -> item.get("soLuong") != null ? ((Number) item.get("soLuong")).intValue() : 0)
                .sum();
        map.put("soLuongSanPham", totalQty);
        map.put("soLoaiSanPham", cart.size());
        return map;
    }
}
