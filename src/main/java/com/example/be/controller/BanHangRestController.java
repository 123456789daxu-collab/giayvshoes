package com.example.be.controller;

import com.example.be.entity.ChiTietHoaDon;
import com.example.be.entity.HoaDon;
import com.example.be.entity.KhachHang;
import com.example.be.entity.SanPhamChiTiet;
import com.example.be.repository.KhachHangRepository;
import com.example.be.repository.SanPhamChiTietRepository;
import com.example.be.service.BanHangService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/pos")
public class BanHangRestController {

    @Autowired
    private BanHangService banHangService;

    @Autowired
    private SanPhamChiTietRepository sanPhamChiTietRepository;

    @Autowired
    private KhachHangRepository khachHangRepository;

    // --- 1. Order Management ---

    @GetMapping("/hoa-don-cho")
    public ResponseEntity<?> getHoaDonCho() {
        List<HoaDon> list = banHangService.getDanhSachHoaDonCho();
        List<Map<String, Object>> result = list.stream().map(this::mapHoaDon).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/tao-hoa-don")
    public ResponseEntity<?> taoHoaDon() {
        try {
            HoaDon hd = banHangService.taoHoaDonCho();
            return ResponseEntity.ok(mapHoaDon(hd));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/hoa-don/{id}")
    public ResponseEntity<?> huyHoaDon(@PathVariable Long id) {
        banHangService.huyHoaDonCho(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/hoa-don/{id}/chi-tiet")
    public ResponseEntity<?> getChiTietHoaDon(@PathVariable Long id) {
        HoaDon hd = banHangService.getDanhSachHoaDonCho().stream().filter(h -> h.getId().equals(id)).findFirst().orElse(null);
        if (hd == null) return ResponseEntity.notFound().build();
        
        List<ChiTietHoaDon> list = banHangService.getChiTietHoaDon(id);
        Map<String, Object> result = mapHoaDon(hd);
        result.put("cart", list.stream().map(this::mapChiTiet).collect(Collectors.toList()));
        return ResponseEntity.ok(result);
    }

    // --- 2. Cart Management ---

    @GetMapping("/san-pham")
    public ResponseEntity<?> getSanPham() {
        List<SanPhamChiTiet> list = sanPhamChiTietRepository.findAll();
        List<Map<String, Object>> result = list.stream()
                .filter(spct -> spct.getTrangThai() != null && spct.getTrangThai() == 1) // 1 = Đang bán
                .map(spct -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", spct.getId());
                    map.put("ma", spct.getMa());
                    map.put("tenSanPham", spct.getSanPham() != null ? spct.getSanPham().getTenSanPham() : "");
                    map.put("mauSac", spct.getMauSac() != null ? spct.getMauSac().getTenMauSac() : "");
                    map.put("size", spct.getCoGiay() != null ? spct.getCoGiay().getSizeGiay() : "");
                    map.put("hinhAnh", spct.getDanhSachHinhAnh().isEmpty() ? null : spct.getDanhSachHinhAnh().get(0));
                    map.put("giaBan", spct.getGiaBan());
                    map.put("soLuongTon", spct.getSoLuongTon());
                    return map;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/hoa-don/{id}/them-san-pham")
    public ResponseEntity<?> themSanPham(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            Long idSanPhamChiTiet = Long.valueOf(payload.get("idSanPhamChiTiet").toString());
            Integer soLuong = Integer.valueOf(payload.get("soLuong").toString());
            banHangService.themSanPhamVaoHoaDon(id, idSanPhamChiTiet, soLuong);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/chi-tiet/{id}")
    public ResponseEntity<?> capNhatSoLuong(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            Integer soLuong = Integer.valueOf(payload.get("soLuong").toString());
            banHangService.capNhatSoLuong(id, soLuong);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/chi-tiet/{id}")
    public ResponseEntity<?> xoaChiTiet(@PathVariable Long id) {
        try {
            banHangService.xoaChiTiet(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // --- 3. Checkout ---

    @PostMapping("/hoa-don/{id}/thanh-toan")
    public ResponseEntity<?> thanhToan(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            String hinhThucThanhToan = payload.get("hinhThucThanhToan").toString();
            BigDecimal tienKhachDua = new BigDecimal(payload.get("tienKhachDua").toString());
            String ghiChu = payload.get("ghiChu") != null ? payload.get("ghiChu").toString() : "";
            String tenKhachHang = payload.get("tenKhachHang") != null ? payload.get("tenKhachHang").toString() : null;
            
            HoaDon hd = banHangService.thanhToan(id, hinhThucThanhToan, tienKhachDua, ghiChu, tenKhachHang);
            return ResponseEntity.ok(mapHoaDon(hd));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // --- 3. Khách hàng & Phiếu giảm giá ---

    @GetMapping("/khach-hang")
    public ResponseEntity<?> getKhachHang() {
        List<KhachHang> list = khachHangRepository.findAll();
        List<Map<String, Object>> result = list.stream()
                .map(kh -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", kh.getId());
                    map.put("hoTen", kh.getHoTen());
                    map.put("soDienThoai", kh.getSoDienThoai());
                    return map;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PutMapping("/hoa-don/{id}/khach-hang")
    public ResponseEntity<?> capNhatKhachHang(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            Long idKhachHang = (payload.get("idKhachHang") != null) ? Long.valueOf(payload.get("idKhachHang").toString()) : null;
            HoaDon hd = banHangService.capNhatKhachHang(id, idKhachHang);
            return ResponseEntity.ok(mapHoaDon(hd));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @Autowired
    private com.example.be.repository.PhieuGiamGiaRepository phieuGiamGiaRepository;

    @GetMapping("/phieu-giam-gia")
    public ResponseEntity<?> getPhieuGiamGia() {
        List<com.example.be.entity.PhieuGiamGia> list = phieuGiamGiaRepository.findAll();
        List<Map<String, Object>> result = list.stream()
                .filter(p -> p.getTrangThai() != null && p.getTrangThai() == 1) // 1 = Đang hoạt động
                .filter(p -> p.getSoLuong() > (p.getSoLuongDaDung() == null ? 0 : p.getSoLuongDaDung())) // Còn lượt dùng
                .map(p -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", p.getId());
                    map.put("maVoucher", p.getMaVoucher());
                    map.put("tenVoucher", p.getTenVoucher());
                    map.put("loaiGiamGia", p.getLoaiGiamGia());
                    map.put("giaTriGiam", p.getGiaTriGiam());
                    map.put("donToiThieu", p.getDonToiThieu());
                    map.put("giamToiDa", p.getGiamToiDa());
                    return map;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PutMapping("/hoa-don/{id}/phieu-giam-gia")
    public ResponseEntity<?> capNhatPhieuGiamGia(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            Long idPhieu = (payload.get("idPhieuGiamGia") != null) ? Long.valueOf(payload.get("idPhieuGiamGia").toString()) : null;
            HoaDon hd = banHangService.capNhatPhieuGiamGia(id, idPhieu);
            return ResponseEntity.ok(mapHoaDon(hd));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // --- Helpers ---

    private Map<String, Object> mapHoaDon(HoaDon hd) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", hd.getId());
        map.put("maHoaDon", hd.getMaHoaDon());
        map.put("tongTienHang", hd.getTongTienHang());
        map.put("tienGiamGia", hd.getTienGiamGia());
        map.put("tongTienThanhToan", hd.getTongTienThanhToan());
        
        if (hd.getKhachHang() != null) {
            Map<String, Object> khMap = new HashMap<>();
            khMap.put("id", hd.getKhachHang().getId());
            khMap.put("hoTen", hd.getKhachHang().getHoTen());
            khMap.put("soDienThoai", hd.getKhachHang().getSoDienThoai());
            map.put("khachHang", khMap);
        }

        if (hd.getPhieuGiamGia() != null) {
            Map<String, Object> pggMap = new HashMap<>();
            pggMap.put("id", hd.getPhieuGiamGia().getId());
            pggMap.put("maVoucher", hd.getPhieuGiamGia().getMaVoucher());
            pggMap.put("loaiGiamGia", hd.getPhieuGiamGia().getLoaiGiamGia());
            pggMap.put("giaTriGiam", hd.getPhieuGiamGia().getGiaTriGiam());
            map.put("phieuGiamGia", pggMap);
        }
        return map;
    }

    private Map<String, Object> mapChiTiet(ChiTietHoaDon ct) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", ct.getId());
        map.put("soLuong", ct.getSoLuong());
        map.put("donGia", ct.getDonGia());
        map.put("thanhTien", ct.getThanhTien());
        
        if (ct.getSanPhamChiTiet() != null) {
            SanPhamChiTiet spct = ct.getSanPhamChiTiet();
            map.put("idSanPhamChiTiet", spct.getId());
            map.put("maSanPham", spct.getMa());
            map.put("tenSanPham", spct.getSanPham() != null ? spct.getSanPham().getTenSanPham() : "");
            map.put("mauSac", spct.getMauSac() != null ? spct.getMauSac().getTenMauSac() : "");
            map.put("size", spct.getCoGiay() != null ? spct.getCoGiay().getSizeGiay() : "");
            map.put("hinhAnh", spct.getDanhSachHinhAnh().isEmpty() ? null : spct.getDanhSachHinhAnh().get(0));
        }
        return map;
    }
}
