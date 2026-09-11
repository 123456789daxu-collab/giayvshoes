package com.example.be.controller;

import com.example.be.entity.DanhGia;
import com.example.be.service.DanhGiaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/danh-gia")
public class AdminDanhGiaRestController {

    @Autowired private DanhGiaService danhGiaService;

    @GetMapping
    public ResponseEntity<?> getAllReviews() {
        return ResponseEntity.ok(danhGiaService.getAllReviews());
    }

    @GetMapping("/by-product")
    public ResponseEntity<?> getReviewsByProduct() {
        return ResponseEntity.ok(danhGiaService.getReviewsByProduct());
    }

    @GetMapping("/analyze/{productId}")
    public ResponseEntity<?> analyzeProductReviews(@PathVariable Long productId) {
        Map<String, Object> resp = danhGiaService.analyzeProductReviews(productId);
        if (resp == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getStats() {
        return ResponseEntity.ok(danhGiaService.getStats());
    }

    @PutMapping("/{id}/reply")
    public ResponseEntity<?> replyReview(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        try {
            String phanHoi = payload.get("phanHoi");
            String nguoiPhanHoi = payload.getOrDefault("nguoiPhanHoi", "Shop VShoes");
            DanhGia dg = danhGiaService.replyReview(id, phanHoi, nguoiPhanHoi);
            return ResponseEntity.ok(Map.of("success", true, "message", "Đã gửi phản hồi thành công!", "data", dg));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}/toggle-visibility")
    public ResponseEntity<?> toggleVisibility(@PathVariable Long id) {
        try {
            DanhGia dg = danhGiaService.toggleVisibility(id);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "trangThai", dg.getTrangThai(),
                    "message", dg.getTrangThai() == 1 ? "Đã hiện đánh giá!" : "Đã ẩn đánh giá!"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteReview(@PathVariable Long id) {
        try {
            danhGiaService.deleteReview(id);
            return ResponseEntity.ok(Map.of("success", true, "message", "Đã xóa đánh giá thành công!"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
