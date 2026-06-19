package com.example.be.controller;

import com.example.be.entity.KhachHang;
import com.example.be.entity.DiaChi;
import com.example.be.dto.KhachHangDto;
import com.example.be.dto.DiaChiDto;
import com.example.be.service.KhachHangService;
import com.example.be.service.DiaChiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/khach-hang")
public class KhachHangController {

    @Autowired
    private KhachHangService khachHangService;

    @Autowired
    private DiaChiService diaChiService;

    // 1. Phân trang + lọc danh sách khách hàng
    @GetMapping
    public ResponseEntity<?> getCustomers(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "gioiTinh", required = false) Boolean gioiTinh,
            @RequestParam(value = "dob", required = false) String dob,
            @RequestParam(value = "trangThai", required = false) Integer trangThai,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size
    ) {
        try {
            LocalDate dateOfBirth = null;
            if (dob != null && !dob.trim().isEmpty()) {
                dateOfBirth = LocalDate.parse(dob);
            }
            Page<KhachHang> result = khachHangService.searchKhachHang(search, gioiTinh, dateOfBirth, trangThai, page, size);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Lỗi tìm kiếm: " + e.getMessage()));
        }
    }

    // 2. Chi tiết khách hàng
    @GetMapping("/{id}")
    public ResponseEntity<?> getCustomerDetail(@PathVariable("id") Long id) {
        try {
            KhachHang customer = khachHangService.findById(id);
            return ResponseEntity.ok(customer);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    // 3. Thêm mới khách hàng
    @PostMapping
    public ResponseEntity<?> createCustomer(@RequestBody KhachHangDto dto) {
        try {
            KhachHang customer = khachHangService.createKhachHang(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(customer);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // 4. Cập nhật khách hàng
    @PutMapping("/{id}")
    public ResponseEntity<?> updateCustomer(@PathVariable("id") Long id, @RequestBody KhachHangDto dto) {
        try {
            KhachHang customer = khachHangService.updateKhachHang(id, dto);
            return ResponseEntity.ok(customer);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // 5. Cập nhật nhanh trạng thái
    @PatchMapping("/{id}/trang-thai")
    public ResponseEntity<?> toggleCustomerStatus(
            @PathVariable("id") Long id,
            @RequestParam("trangThai") Integer trangThai
    ) {
        try {
            KhachHang customer = khachHangService.toggleStatus(id, trangThai);
            return ResponseEntity.ok(customer);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // 6. Lấy danh sách địa chỉ của 1 khách hàng
    @GetMapping("/{id}/dia-chi")
    public ResponseEntity<?> getCustomerAddresses(@PathVariable("id") Long id) {
        try {
            List<DiaChi> list = diaChiService.findByKhachHangId(id);
            return ResponseEntity.ok(list);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // 7. Thêm mới địa chỉ cho 1 khách hàng
    @PostMapping("/{id}/dia-chi")
    public ResponseEntity<?> addCustomerAddress(
            @PathVariable("id") Long id,
            @RequestBody DiaChiDto dto
    ) {
        try {
            DiaChi diaChi = diaChiService.addDiaChi(id, dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(diaChi);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // 8. Chỉnh sửa địa chỉ
    @PutMapping("/dia-chi/{addressId}")
    public ResponseEntity<?> updateAddress(
            @PathVariable("addressId") Long addressId,
            @RequestBody DiaChiDto dto
    ) {
        try {
            DiaChi diaChi = diaChiService.updateDiaChi(addressId, dto);
            return ResponseEntity.ok(diaChi);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // 9. Xóa địa chỉ
    @DeleteMapping("/dia-chi/{addressId}")
    public ResponseEntity<?> deleteAddress(@PathVariable("addressId") Long addressId) {
        try {
            diaChiService.deleteDiaChi(addressId);
            return ResponseEntity.ok(Map.of("message", "Xóa địa chỉ thành công!"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // 10. Đặt làm địa chỉ mặc định
    @PatchMapping("/dia-chi/{addressId}/mac-dinh")
    public ResponseEntity<?> setDefaultAddress(@PathVariable("addressId") Long addressId) {
        try {
            DiaChi diaChi = diaChiService.setDefaultDiaChi(addressId);
            return ResponseEntity.ok(diaChi);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // 11. Xuất file Excel
    @GetMapping("/export")
    public ResponseEntity<?> exportExcel(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "gioiTinh", required = false) Boolean gioiTinh,
            @RequestParam(value = "dob", required = false) String dob,
            @RequestParam(value = "trangThai", required = false) Integer trangThai
    ) {
        try {
            LocalDate dateOfBirth = null;
            if (dob != null && !dob.trim().isEmpty()) {
                dateOfBirth = LocalDate.parse(dob);
            }
            byte[] fileData = khachHangService.exportExcel(search, gioiTinh, dateOfBirth, trangThai);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", "danh-sach-khach-hang.xlsx");
            
            return new ResponseEntity<>(fileData, headers, HttpStatus.OK);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Lỗi xuất file Excel: " + e.getMessage()));
        }
    }

    // 12. Tải template Excel mẫu
    @GetMapping("/template")
    public ResponseEntity<?> downloadTemplate() {
        try {
            byte[] fileData = khachHangService.downloadTemplate();
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", "mau-nhap-khach-hang.xlsx");
            
            return new ResponseEntity<>(fileData, headers, HttpStatus.OK);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Lỗi tải template: " + e.getMessage()));
        }
    }

    // 13. Import Excel
    @PostMapping("/import")
    public ResponseEntity<?> importExcel(@RequestParam("file") MultipartFile file) {
        try {
            khachHangService.importExcel(file);
            return ResponseEntity.ok(Map.of("message", "Import Excel thành công!"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Lỗi import Excel: " + e.getMessage()));
        }
    }
}
