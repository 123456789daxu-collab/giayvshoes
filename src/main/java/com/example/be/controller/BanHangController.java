package com.example.be.controller;

import com.example.be.entity.*;
import com.example.be.repository.KhachHangRepository;
import com.example.be.repository.PhieuGiamGiaRepository;
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
@RequestMapping("/api/ban-hang")
public class BanHangController {

    @Autowired
    private BanHangService banHangService;

    @Autowired
    private SanPhamChiTietRepository sanPhamChiTietRepository;

    @Autowired
    private KhachHangRepository khachHangRepository;

    @Autowired
    private PhieuGiamGiaRepository phieuGiamGiaRepository;

    // --- 1. Quản lý Hóa đơn chờ ---

    @GetMapping("/hoa-don-cho")
    public ResponseEntity<?> getHoaDonCho() {
        List<HoaDon> list = banHangService.getDanhSachHoaDonCho();
        List<Map<String, Object>> result = list.stream().map(this::mapHoaDonToResponse).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/tao-hoa-don")
    public ResponseEntity<?> taoHoaDon() {
        HoaDon hd = banHangService.taoHoaDonCho();
        return ResponseEntity.ok(mapHoaDonToResponse(hd));
    }

    @DeleteMapping("/hoa-don/{id}")
    public ResponseEntity<?> huyHoaDon(@PathVariable Long id) {
        banHangService.huyHoaDonCho(id);
        return ResponseEntity.ok().build();
    }

    // --- 2. Quản lý Sản phẩm & Chi tiết hóa đơn ---

    @GetMapping("/san-pham")
    public ResponseEntity<?> getSanPhamChoPOS(@RequestParam(required = false, defaultValue = "") String keyword) {
        // Simple search: get all active SanPhamChiTiet
        // In real app, we should use a proper search query with keyword. Here we fetch all and filter for simplicity
        List<SanPhamChiTiet> list = sanPhamChiTietRepository.findAll();
        List<Map<String, Object>> result = list.stream()
                .filter(spct -> spct.getTrangThai() != null && spct.getTrangThai() == 1) // 1 = Đang bán
                .filter(spct -> spct.getSoLuongTon() != null && spct.getSoLuongTon() > 0)
                .filter(spct -> keyword.isEmpty() || 
                                (spct.getSanPham() != null && spct.getSanPham().getTenSanPham().toLowerCase().contains(keyword.toLowerCase())) ||
                                (spct.getMa() != null && spct.getMa().toLowerCase().contains(keyword.toLowerCase())))
                .map(spct -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", spct.getId());
                    map.put("ma", spct.getMa());
                    map.put("tenSanPham", spct.getSanPham() != null ? spct.getSanPham().getTenSanPham() : "");
                    map.put("mauSac", spct.getMauSac() != null ? spct.getMauSac().getTenMauSac() : "");
                    map.put("size", spct.getCoGiay() != null ? spct.getCoGiay().getSizeGiay() : "");
                    map.put("giaBan", spct.getGiaBan());
                    map.put("soLuongTon", spct.getSoLuongTon());
                    return map;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/hoa-don/{id}/chi-tiet")
    public ResponseEntity<?> getChiTietHoaDon(@PathVariable Long id) {
        List<ChiTietHoaDon> list = banHangService.getChiTietHoaDon(id);
        List<Map<String, Object>> result = list.stream().map(this::mapChiTietToResponse).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/hoa-don/{id}/san-pham")
    public ResponseEntity<?> themSanPham(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        Long idSanPhamChiTiet = Long.valueOf(payload.get("idSanPhamChiTiet").toString());
        Integer soLuong = Integer.valueOf(payload.get("soLuong").toString());
        try {
            ChiTietHoaDon ct = banHangService.themSanPhamVaoHoaDon(id, idSanPhamChiTiet, soLuong);
            return ResponseEntity.ok(mapChiTietToResponse(ct));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/chi-tiet/{id}")
    public ResponseEntity<?> capNhatSoLuong(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        Integer soLuong = Integer.valueOf(payload.get("soLuong").toString());
        try {
            ChiTietHoaDon ct = banHangService.capNhatSoLuong(id, soLuong);
            return ResponseEntity.ok(mapChiTietToResponse(ct));
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

    // --- 3. Khách hàng & Phiếu giảm giá ---

    @GetMapping("/khach-hang")
    public ResponseEntity<?> getKhachHang(@RequestParam(required = false, defaultValue = "") String keyword) {
        List<KhachHang> list = khachHangRepository.findAll();
        List<Map<String, Object>> result = list.stream()
                .filter(kh -> keyword.isEmpty() || 
                              (kh.getHoTen() != null && kh.getHoTen().toLowerCase().contains(keyword.toLowerCase())) ||
                              (kh.getSoDienThoai() != null && kh.getSoDienThoai().contains(keyword)))
                .map(kh -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", kh.getId());
                    map.put("hoTen", kh.getHoTen());
                    map.put("soDienThoai", kh.getSoDienThoai());
                    map.put("email", kh.getEmail());
                    return map;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PutMapping("/hoa-don/{id}/khach-hang")
    public ResponseEntity<?> capNhatKhachHang(@PathVariable Long id, @RequestBody(required = false) Map<String, Object> payload) {
        try {
            Long idKhachHang = (payload != null && payload.get("idKhachHang") != null) ? Long.valueOf(payload.get("idKhachHang").toString()) : null;
            HoaDon hd = banHangService.capNhatKhachHang(id, idKhachHang);
            return ResponseEntity.ok(mapHoaDonToResponse(hd));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/phieu-giam-gia")
    public ResponseEntity<?> getPhieuGiamGia() {
        List<PhieuGiamGia> list = phieuGiamGiaRepository.findAll();
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
    public ResponseEntity<?> capNhatPhieuGiamGia(@PathVariable Long id, @RequestBody(required = false) Map<String, Object> payload) {
        try {
            Long idPhieu = (payload != null && payload.get("idPhieuGiamGia") != null) ? Long.valueOf(payload.get("idPhieuGiamGia").toString()) : null;
            HoaDon hd = banHangService.capNhatPhieuGiamGia(id, idPhieu);
            return ResponseEntity.ok(mapHoaDonToResponse(hd));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // --- 4. Thanh toán ---

    @PostMapping("/hoa-don/{id}/thanh-toan")
    public ResponseEntity<?> thanhToan(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            BigDecimal tongTienHang = new BigDecimal(payload.get("tongTienHang").toString());
            BigDecimal tienGiamGia = new BigDecimal(payload.get("tienGiamGia").toString());
            BigDecimal tongTienThanhToan = new BigDecimal(payload.get("tongTienThanhToan").toString());
            String ghiChu = payload.get("ghiChu") != null ? payload.get("ghiChu").toString() : "";
            
            HoaDon hd = banHangService.thanhToan(id, tongTienHang, tienGiamGia, tongTienThanhToan, ghiChu);
            return ResponseEntity.ok(mapHoaDonToResponse(hd));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // --- Helper methods to map entities to simple Maps to prevent infinite recursion and lazy loading issues ---

    private Map<String, Object> mapHoaDonToResponse(HoaDon hd) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", hd.getId());
        map.put("maHoaDon", hd.getMaHoaDon());
        map.put("loaiHoaDon", hd.getLoaiHoaDon());
        map.put("trangThai", hd.getTrangThai());
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
            pggMap.put("tenVoucher", hd.getPhieuGiamGia().getTenVoucher());
            pggMap.put("giaTriGiam", hd.getPhieuGiamGia().getGiaTriGiam());
            pggMap.put("loaiGiamGia", hd.getPhieuGiamGia().getLoaiGiamGia());
            map.put("phieuGiamGia", pggMap);
        }
        return map;
    }

    private Map<String, Object> mapChiTietToResponse(ChiTietHoaDon ct) {
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
            map.put("soLuongTon", spct.getSoLuongTon()); // Add this line to show remaining stock
        }
        return map;
    }
}
