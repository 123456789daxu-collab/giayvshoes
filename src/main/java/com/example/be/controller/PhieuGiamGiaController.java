package com.example.be.controller;

import com.example.be.entity.PhieuGiamGia;
import com.example.be.dto.PhieuGiamGiaDto;
import com.example.be.dto.KhachHangVoucherDto;
import com.example.be.service.PhieuGiamGiaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/phieu-giam-gia")
public class PhieuGiamGiaController {

    @Autowired
    private PhieuGiamGiaService phieuGiamGiaService;

    // 1. Phân trang + lọc danh sách phiếu giảm giá
    @GetMapping
    public ResponseEntity<?> getVouchers(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "loaiGiamGia", required = false) String loaiGiamGia,
            @RequestParam(value = "loaiPhieu", required = false) String loaiPhieu,
            @RequestParam(value = "ngayBatDau", required = false) String ngayBatDau,
            @RequestParam(value = "ngayKetThuc", required = false) String ngayKetThuc,
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

            Page<PhieuGiamGia> result = phieuGiamGiaService.searchVouchers(search, loaiGiamGia, loaiPhieu, start, end, page, size);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Lỗi tìm kiếm phiếu giảm giá: " + e.getMessage()));
        }
    }

    // 2. Chi tiết phiếu giảm giá
    @GetMapping("/{id}")
    public ResponseEntity<?> getVoucherDetail(@PathVariable("id") Long id) {
        try {
            PhieuGiamGia voucher = phieuGiamGiaService.findById(id);
            return ResponseEntity.ok(voucher);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    // 3. Lấy danh sách khách hàng được áp dụng (cho phiếu cá nhân)
    @GetMapping("/{id}/customer-ids")
    public ResponseEntity<?> getCustomerIdsByVoucher(@PathVariable("id") Long id) {
        try {
            List<Long> customerIds = phieuGiamGiaService.getCustomerIdsByVoucherId(id);
            return ResponseEntity.ok(customerIds);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // 4. Thêm mới phiếu giảm giá
    @PostMapping
    public ResponseEntity<?> createVoucher(@RequestBody PhieuGiamGiaDto dto) {
        try {
            PhieuGiamGia voucher = phieuGiamGiaService.createVoucher(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(voucher);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // 5. Cập nhật phiếu giảm giá
    @PutMapping("/{id}")
    public ResponseEntity<?> updateVoucher(@PathVariable("id") Long id, @RequestBody PhieuGiamGiaDto dto) {
        try {
            PhieuGiamGia voucher = phieuGiamGiaService.updateVoucher(id, dto);
            return ResponseEntity.ok(voucher);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // 6. Cập nhật nhanh trạng thái
    @PatchMapping("/{id}/trang-thai")
    public ResponseEntity<?> toggleVoucherStatus(
            @PathVariable("id") Long id,
            @RequestParam("trangThai") Integer trangThai
    ) {
        try {
            PhieuGiamGia voucher = phieuGiamGiaService.toggleStatus(id, trangThai);
            return ResponseEntity.ok(voucher);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // 7. Lấy danh sách khách hàng kèm thống kê để chọn cho phiếu giảm giá cá nhân
    @GetMapping("/khach-hang-statistics")
    public ResponseEntity<?> getCustomerStatistics(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "month", required = false) Integer month,
            @RequestParam(value = "year", required = false) Integer year,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size
    ) {
        try {
            Page<KhachHangVoucherDto> result = phieuGiamGiaService.getCustomerStatistics(search, month, year, page, size);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Lỗi lấy thông tin khách hàng: " + e.getMessage()));
        }
    }

    // 8. Xuất file Excel
    @GetMapping("/export")
    public ResponseEntity<?> exportExcel(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "loaiGiamGia", required = false) String loaiGiamGia,
            @RequestParam(value = "loaiPhieu", required = false) String loaiPhieu,
            @RequestParam(value = "ngayBatDau", required = false) String ngayBatDau,
            @RequestParam(value = "ngayKetThuc", required = false) String ngayKetThuc
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

            byte[] fileData = phieuGiamGiaService.exportExcel(search, loaiGiamGia, loaiPhieu, start, end);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", "danh-sach-phieu-giam-gia.xlsx");
            
            return new ResponseEntity<>(fileData, headers, HttpStatus.OK);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Lỗi xuất file Excel: " + e.getMessage()));
        }
    }
}
