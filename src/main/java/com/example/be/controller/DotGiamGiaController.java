package com.example.be.controller;

import com.example.be.entity.DotGiamGia;
import com.example.be.dto.DotGiamGiaDto;
import com.example.be.dto.SanPhamGiamGiaDto;
import com.example.be.service.DotGiamGiaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dot-giam-gia")
public class DotGiamGiaController {

    @Autowired
    private DotGiamGiaService dotGiamGiaService;

    // 1. Phân trang + lọc danh sách đợt giảm giá
    @GetMapping
    public ResponseEntity<?> getCampaigns(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "ngayBatDau", required = false) String ngayBatDau,
            @RequestParam(value = "ngayKetThuc", required = false) String ngayKetThuc,
            @RequestParam(value = "trangThai", required = false) Integer trangThai,
            @RequestParam(value = "hinhThucGiam", required = false) String hinhThucGiam,
            @RequestParam(value = "giaTriGiam", required = false) java.math.BigDecimal giaTriGiam,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size
    ) {
        try {
            LocalDateTime start = null;
            LocalDateTime end = null;

            if (ngayBatDau != null && !ngayBatDau.trim().isEmpty()) {
                start = LocalDateTime.parse(ngayBatDau);
            }
            if (ngayKetThuc != null && !ngayKetThuc.trim().isEmpty()) {
                end = LocalDateTime.parse(ngayKetThuc);
            }

            Page<DotGiamGia> result = dotGiamGiaService.searchCampaigns(search, start, end, trangThai, hinhThucGiam, giaTriGiam, page, size);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Lỗi tìm kiếm đợt giảm giá: " + e.getMessage()));
        }
    }

    // 2. Chi tiết đợt giảm giá
    @GetMapping("/{id}")
    public ResponseEntity<?> getCampaignDetail(@PathVariable("id") Long id) {
        try {
            DotGiamGia campaign = dotGiamGiaService.findById(id);
            return ResponseEntity.ok(campaign);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    // 3. Lấy danh sách ID sản phẩm chi tiết được áp dụng
    @GetMapping("/{id}/product-detail-ids")
    public ResponseEntity<?> getProductDetailIdsByCampaign(@PathVariable("id") Long id) {
        try {
            List<Long> ids = dotGiamGiaService.getProductDetailIdsByCampaignId(id);
            return ResponseEntity.ok(ids);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // 4. Thêm mới đợt giảm giá
    @PostMapping
    public ResponseEntity<?> createCampaign(@RequestBody DotGiamGiaDto dto) {
        try {
            DotGiamGia campaign = dotGiamGiaService.createCampaign(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(campaign);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // 5. Cập nhật đợt giảm giá
    @PutMapping("/{id}")
    public ResponseEntity<?> updateCampaign(@PathVariable("id") Long id, @RequestBody DotGiamGiaDto dto) {
        try {
            DotGiamGia campaign = dotGiamGiaService.updateCampaign(id, dto);
            return ResponseEntity.ok(campaign);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // 6. Cập nhật nhanh trạng thái (Bật/Tắt)
    @PatchMapping("/{id}/trang-thai")
    public ResponseEntity<?> toggleCampaignStatus(
            @PathVariable("id") Long id,
            @RequestParam("trangThai") Integer trangThai
    ) {
        try {
            DotGiamGia campaign = dotGiamGiaService.toggleStatus(id, trangThai);
            return ResponseEntity.ok(campaign);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // Xóa đợt giảm giá
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCampaign(@PathVariable("id") Long id) {
        try {
            dotGiamGiaService.deleteCampaign(id);
            return ResponseEntity.ok(Map.of("message", "Xóa đợt giảm giá thành công"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // 7. Lấy danh sách sản phẩm chi tiết kèm phân trang để chọn
    @GetMapping("/san-pham-chi-tiet")
    public ResponseEntity<?> getProductDetails(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size
    ) {
        try {
            Page<com.example.be.dto.SanPhamChiTietGiamGiaDto> result = dotGiamGiaService.getProductDetails(search, page, size);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Lỗi lấy danh sách sản phẩm: " + e.getMessage()));
        }
    }

    // 8. Xuất file Excel
    @GetMapping("/export")
    public ResponseEntity<?> exportExcel(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "ngayBatDau", required = false) String ngayBatDau,
            @RequestParam(value = "ngayKetThuc", required = false) String ngayKetThuc,
            @RequestParam(value = "trangThai", required = false) Integer trangThai,
            @RequestParam(value = "hinhThucGiam", required = false) String hinhThucGiam,
            @RequestParam(value = "giaTriGiam", required = false) java.math.BigDecimal giaTriGiam
    ) {
        try {
            LocalDateTime start = null;
            LocalDateTime end = null;

            if (ngayBatDau != null && !ngayBatDau.trim().isEmpty()) {
                start = LocalDateTime.parse(ngayBatDau);
            }
            if (ngayKetThuc != null && !ngayKetThuc.trim().isEmpty()) {
                end = LocalDateTime.parse(ngayKetThuc);
            }

            byte[] fileData = dotGiamGiaService.exportExcel(search, start, end, trangThai, hinhThucGiam, giaTriGiam);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", "danh-sach-dot-giam-gia.xlsx");

            return new ResponseEntity<>(fileData, headers, HttpStatus.OK);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Lỗi xuất file Excel: " + e.getMessage()));
        }
    }
}
