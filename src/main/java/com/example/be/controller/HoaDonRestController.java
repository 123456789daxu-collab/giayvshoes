package com.example.be.controller;

import com.example.be.dto.HoaDonDTO;
import com.example.be.service.EmailService;
import com.example.be.service.HoaDonService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/hoa-don")
public class HoaDonRestController {

    private final HoaDonService hoaDonService;
    private final EmailService emailService;

    public HoaDonRestController(HoaDonService hoaDonService, EmailService emailService) {
        this.hoaDonService = hoaDonService;
        this.emailService = emailService;
    }

    @GetMapping("/search")
    public ResponseEntity<List<HoaDonDTO>> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer trangThai,
            @RequestParam(required = false) String loaiHoaDon,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
            
        List<HoaDonDTO> results = hoaDonService.search(keyword, trangThai, loaiHoaDon, minPrice, maxPrice, startDate, endDate);
        return ResponseEntity.ok(results);
    }

    @GetMapping("/max-price")
    public ResponseEntity<BigDecimal> getMaxPrice() {
        return ResponseEntity.ok(hoaDonService.getMaxPrice());
    }

    @GetMapping("/{id}")
    public ResponseEntity<HoaDonDTO> getById(@PathVariable Long id) {
        return hoaDonService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<HoaDonDTO> create(@RequestBody com.example.be.entity.HoaDon hoaDon) {
        return ResponseEntity.ok(hoaDonService.create(hoaDon));
    }

    @PostMapping("/ban-hang")
    public ResponseEntity<?> createFromBanHang(@RequestBody java.util.Map<String, Object> payload) {
        try {
            return ResponseEntity.ok(hoaDonService.createFromBanHang(payload));
        } catch (IllegalArgumentException ex) {
            java.util.Map<String, String> error = new java.util.LinkedHashMap<>();
            error.put("error", ex.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody com.example.be.entity.HoaDon hoaDon) {
        try {
            return hoaDonService.update(id, hoaDon)
                    .<ResponseEntity<?>>map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (IllegalArgumentException ex) {
            java.util.Map<String, String> error = new java.util.LinkedHashMap<>();
            error.put("error", ex.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        hoaDonService.delete(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/items")
    public ResponseEntity<List<java.util.Map<String, Object>>> getItems(@PathVariable Long id) {
        List<java.util.Map<String, Object>> items = hoaDonService.getItemsByHoaDonId(id);
        return ResponseEntity.ok(items);
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<List<java.util.Map<String, Object>>> getHistory(@PathVariable Long id) {
        List<com.example.be.entity.LichSuHoaDon> historyList = hoaDonService.getHistoryByHoaDonId(id);
        List<java.util.Map<String, Object>> response = historyList.stream().map(h -> {
            java.util.Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", h.getId());
            map.put("hanhDong", h.getHanhDong());
            map.put("ngayTao", h.getNgayTao());
            map.put("ghiChu", h.getGhiChu());
            return map;
        }).collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> export(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer trangThai,
            @RequestParam(required = false) String loaiHoaDon,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) throws java.io.IOException {
            
        byte[] bytes = hoaDonService.exportInvoicesToExcel(keyword, trangThai, loaiHoaDon, minPrice, maxPrice, startDate, endDate);
        
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDispositionFormData("attachment", "danh_sach_hoa_don.xlsx");
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");
        
        return new ResponseEntity<>(bytes, headers, org.springframework.http.HttpStatus.OK);
    }

    @PostMapping("/init-data")
    public ResponseEntity<String> initData() {
        hoaDonService.generateTestData();
        return ResponseEntity.ok("Đã tạo dữ liệu mẫu thành công!");
    }

    /**
     * Debug endpoint: Đếm tổng số hóa đơn trong DB và trả về 5 hóa đơn mới nhất.
     * Dùng để kiểm tra xem đơn hàng đặt online có được lưu vào DB không.
     * KHÔNG cần đăng nhập (được permit trong SecurityConfig).
     */
    @GetMapping("/debug/count")
    public ResponseEntity<java.util.Map<String, Object>> debugCount() {
        long total = hoaDonService.countAll();
        List<HoaDonDTO> latest = hoaDonService.getLatest5();
        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("totalHoaDon", total);
        result.put("latest5", latest);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{id}/send-email")
    public ResponseEntity<java.util.Map<String, Object>> sendInvoiceEmail(@PathVariable Long id) {
        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        java.util.Optional<HoaDonDTO> invoiceOpt = hoaDonService.findById(id);
        if (invoiceOpt.isEmpty()) {
            result.put("success", false);
            result.put("message", "Không tìm thấy hóa đơn ID=" + id);
            return ResponseEntity.ok(result);
        }
        HoaDonDTO invoice = invoiceOpt.get();
        String toEmail = invoice.getEmail();
        if (toEmail == null || toEmail.isBlank()) {
            // Try extracting from ghiChu
            if (invoice.getGhiChu() != null && invoice.getGhiChu().contains("| EMAIL:")) {
                try {
                    String[] parts = invoice.getGhiChu().split("\\| EMAIL:");
                    if (parts.length > 1) toEmail = parts[1].trim();
                } catch (Exception ignored) {}
            }
        }
        if (toEmail == null || toEmail.isBlank() || !toEmail.contains("@")) {
            result.put("success", false);
            result.put("message", "Hóa đơn này không có email khách hàng. Email trong DB: '" + invoice.getEmail() + "', GhiChu: '" + invoice.getGhiChu() + "'");
            return ResponseEntity.ok(result);
        }
        try {
            List<java.util.Map<String, Object>> items = hoaDonService.getItemsByHoaDonId(id);
            emailService.sendInvoiceEmail(invoice, items);
            result.put("success", true);
            result.put("message", "Đang gửi email đến: " + toEmail);
            result.put("toEmail", toEmail);
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "Lỗi gửi email: " + e.getMessage());
        }
        return ResponseEntity.ok(result);
    }

    /**
     * Test SMTP: Gửi email test trực tiếp đến địa chỉ bạn nhập.
     * Dùng để kiểm tra cấu hình SMTP có hoạt động không.
     * Ví dụ: POST /api/hoa-don/test-email?to=abc@gmail.com
     */
    @PostMapping("/test-email")
    public ResponseEntity<java.util.Map<String, Object>> testEmail(
            @org.springframework.web.bind.annotation.RequestParam String to) {
        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();

        try {
            // Use emailService to send a simple test
            com.example.be.dto.HoaDonDTO testInvoice = HoaDonDTO.builder()
                .id(0L)
                .maHoaDon("TEST_" + System.currentTimeMillis())
                .tenKhachHang("Khách Test")
                .sdtKhachHang("0900000000")
                .diaChiGiao("Địa chỉ test")
                .email(to)
                .ngayTao(java.time.LocalDateTime.now())
                .trangThai(0)
                .tongTien(java.math.BigDecimal.valueOf(500000))
                .phiShip(java.math.BigDecimal.valueOf(30000))
                .tienGiam(java.math.BigDecimal.ZERO)
                .build();

            java.util.List<java.util.Map<String, Object>> testItems = new java.util.ArrayList<>();
            java.util.Map<String, Object> item = new java.util.HashMap<>();
            item.put("tenSanPham", "Giày Test VShoes");
            item.put("mauSac", "Trắng");
            item.put("coGiay", "42");
            item.put("soLuong", 1);
            item.put("donGia", new java.math.BigDecimal("470000"));
            item.put("thanhTien", new java.math.BigDecimal("470000"));
            testItems.add(item);

            emailService.sendInvoiceEmail(testInvoice, testItems);
            result.put("success", true);
            result.put("message", "✅ Đang gửi email test đến: " + to + ". Kiểm tra hộp thư (kể cả Spam) sau 1-2 phút.");
            result.put("toEmail", to);
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "❌ Lỗi: " + e.getMessage());
            result.put("detail", e.toString());
        }
        return ResponseEntity.ok(result);
    }
}

