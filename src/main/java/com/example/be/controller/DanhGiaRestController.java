package com.example.be.controller;

import com.example.be.entity.DanhGia;
import com.example.be.entity.KhachHang;
import com.example.be.service.DanhGiaService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpSession;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * API đánh giá sản phẩm.
 * - Cho phép đánh giá từ đơn hàng hoàn thành (mỗi đơn 1 lần duy nhất).
 * - Cho phép đánh giá trực tiếp từ trang chi tiết sản phẩm.
 * - Trả về danh sách đánh giá thực tế từ cơ sở dữ liệu.
 */
@RestController
@RequestMapping("/api/auth/danh-gia")
public class DanhGiaRestController {

    @Autowired
    private DanhGiaService danhGiaService;

    /** GET /api/auth/danh-gia/check/{hoaDonId} */
    @GetMapping("/check/{hoaDonId}")
    public ResponseEntity<?> check(@PathVariable Long hoaDonId) {
        return ResponseEntity.ok(danhGiaService.checkReviewed(hoaDonId));
    }

    /** POST /api/auth/danh-gia/check-batch — Body: { "hoaDonIds": [1,2,3] } */
    @PostMapping("/check-batch")
    public ResponseEntity<?> checkBatch(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Integer> ids = (List<Integer>) body.get("hoaDonIds");
        return ResponseEntity.ok(danhGiaService.checkBatchReviewed(ids));
    }

    /** POST /api/auth/danh-gia/submit */
    @PostMapping("/submit")
    public ResponseEntity<?> submit(@RequestBody Map<String, Object> payload, HttpSession session) {
        try {
            KhachHang sessionUser = (KhachHang) session.getAttribute("clientUser");
            DanhGia saved = danhGiaService.createReview(payload, sessionUser);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Cảm ơn bạn đã đánh giá sản phẩm!",
                    "id", saved.getId(),
                    "anhDanhGia", saved.getAnhDanhGia() != null ? saved.getAnhDanhGia() : "[]"
            ));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Đã có lỗi xảy ra: " + e.getMessage()));
        }
    }

    /** POST /api/auth/danh-gia/submit-direct */
    @PostMapping("/submit-direct")
    public ResponseEntity<?> submitDirect(@RequestBody Map<String, Object> payload, HttpSession session) {
        try {
            KhachHang sessionUser = (KhachHang) session.getAttribute("clientUser");
            danhGiaService.createDirectReview(payload, sessionUser);
            return ResponseEntity.ok(Map.of("success", true, "message", "Đã gửi đánh giá thành công!"));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** GET /api/auth/danh-gia/san-pham/{id} */
    @GetMapping("/san-pham/{id}")
    public ResponseEntity<?> getBySanPham(@PathVariable Long id) {
        return ResponseEntity.ok(danhGiaService.getClientReviewsByProduct(id));
    }

    /** GET /api/auth/danh-gia/summary-all */
    @GetMapping("/summary-all")
    public ResponseEntity<?> getSummaryAll() {
        return ResponseEntity.ok(danhGiaService.getSummaryAll());
    }
}
