package com.example.be.controller;

import com.example.be.dto.HoaDonDTO;
import com.example.be.service.HoaDonService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth/tracking")
public class ClientTrackingRestController {

    @Autowired
    private HoaDonService hoaDonService;

    @GetMapping("/by-email")
    public ResponseEntity<?> getByEmail(@RequestParam String email, jakarta.servlet.http.HttpSession session) {
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", "Email không hợp lệ!"));
        }
        final String emailLower = email.trim().toLowerCase();
        final com.example.be.entity.KhachHang sessionUser = (com.example.be.entity.KhachHang) session.getAttribute("clientUser");
        final java.util.regex.Pattern emailInGhiChu = java.util.regex.Pattern.compile(
            "\\| EMAIL:([^\\|\\s]+)", java.util.regex.Pattern.CASE_INSENSITIVE);

        List<HoaDonDTO> allOrders = hoaDonService.search(null, null, null, null, null, null, null);
        List<HoaDonDTO> matched = allOrders.stream().filter(hd -> {
            // 1. Khớp email từ DTO
            if (hd.getEmail() != null && hd.getEmail().trim().toLowerCase().equals(emailLower)) return true;

            // 2. Trích email từ ghiChu
            if (hd.getGhiChu() != null && hd.getGhiChu().contains("EMAIL:")) {
                java.util.regex.Matcher m = emailInGhiChu.matcher(hd.getGhiChu());
                if (m.find()) {
                    String ghiChuEmail = m.group(1).trim().toLowerCase();
                    if (ghiChuEmail.equals(emailLower)) return true;
                }
            }

            // 3. Khớp thông tin user đang đăng nhập
            if (sessionUser != null && sessionUser.getEmail() != null && sessionUser.getEmail().trim().toLowerCase().equals(emailLower)) {
                if (hd.getTenKhachHang() != null && sessionUser.getHoTen() != null && hd.getTenKhachHang().trim().equalsIgnoreCase(sessionUser.getHoTen().trim())) return true;
                if (hd.getSdtKhachHang() != null && sessionUser.getSoDienThoai() != null && hd.getSdtKhachHang().trim().equals(sessionUser.getSoDienThoai().trim())) return true;
            }
            return false;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(matched);
    }

    @GetMapping("/search")
    public ResponseEntity<?> search(@RequestParam String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return ResponseEntity.ok(java.util.Collections.emptyList());
        }
        String kw = keyword.trim();
        if (kw.startsWith("#")) kw = kw.substring(1).trim();

        List<HoaDonDTO> matched = hoaDonService.search(kw, null, null, null, null, null, null);
        if (matched == null || matched.isEmpty()) {
            List<HoaDonDTO> all = hoaDonService.search(null, null, null, null, null, null, null);
            final String kwUpper = kw.toUpperCase();
            matched = all.stream().filter(hd -> 
                (hd.getMaHoaDon() != null && hd.getMaHoaDon().toUpperCase().contains(kwUpper)) ||
                (hd.getId() != null && String.valueOf(hd.getId()).equals(kwUpper))
            ).collect(Collectors.toList());
        }
        return ResponseEntity.ok(matched);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        return hoaDonService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/items")
    public ResponseEntity<?> getItems(@PathVariable Long id) {
        return ResponseEntity.ok(hoaDonService.getItemsByHoaDonId(id));
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<?> getHistory(@PathVariable Long id) {
        return ResponseEntity.ok(hoaDonService.getHistoryByHoaDonId(id));
    }

    /**
     * Cập nhật thông tin nhận hàng, trangThai và/hoặc ghiChu — KHÔNG ghi đè các trường khác thành null.
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
                                    @RequestBody java.util.Map<String, Object> payload) {
        Integer newTrangThai = null;
        String newGhiChu = null;
        String tenNguoiNhan = null;
        String sdtNguoiNhan = null;
        String diaChiGiao = null;

        if (payload.containsKey("trangThai") && payload.get("trangThai") != null) {
            newTrangThai = ((Number) payload.get("trangThai")).intValue();
        }
        if (payload.containsKey("ghiChu") && payload.get("ghiChu") != null) {
            newGhiChu = payload.get("ghiChu").toString();
        }
        if (payload.containsKey("tenNguoiNhan") && payload.get("tenNguoiNhan") != null) {
            tenNguoiNhan = payload.get("tenNguoiNhan").toString();
        }
        if (payload.containsKey("sdtNguoiNhan") && payload.get("sdtNguoiNhan") != null) {
            sdtNguoiNhan = payload.get("sdtNguoiNhan").toString();
        }
        if (payload.containsKey("diaChiGiao") && payload.get("diaChiGiao") != null) {
            diaChiGiao = payload.get("diaChiGiao").toString();
        } else if (payload.containsKey("diaChiNhan") && payload.get("diaChiNhan") != null) {
            diaChiGiao = payload.get("diaChiNhan").toString();
        }

        try {
            return hoaDonService.patchShippingAndStatusAndNote(id, tenNguoiNhan, sdtNguoiNhan, diaChiGiao, newTrangThai, newGhiChu)
                    .<ResponseEntity<?>>map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (IllegalArgumentException ex) {
            java.util.Map<String, String> error = new java.util.LinkedHashMap<>();
            error.put("error", ex.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Khách hàng hủy đơn hoặc yêu cầu hủy đơn từ trang tra cứu.
     */
    @PostMapping("/cancel/{id}")
    public ResponseEntity<?> cancelOrder(@PathVariable Long id, 
                                         @RequestBody(required = false) java.util.Map<String, String> payload) {
        String reason = (payload != null && payload.get("reason") != null) ? payload.get("reason") : "Khách hàng hủy trên website";
        try {
            HoaDonDTO updatedDto = hoaDonService.cancelOrderByCustomer(id, reason);
            return ResponseEntity.ok(java.util.Map.of(
                "success", true,
                "message", updatedDto.getTrangThai() == 8 
                    ? "Đã gửi yêu cầu hủy đơn hàng thành công! Quản trị viên sẽ xử lý yêu cầu của bạn." 
                    : "Đã hủy đơn hàng thành công!",
                "data", updatedDto
            ));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(java.util.Map.of(
                "success", false,
                "message", ex.getMessage()
            ));
        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR).body(java.util.Map.of(
                "success", false,
                "message", "Lỗi xử lý hủy đơn hàng: " + ex.getMessage()
            ));
        }
    }
}
