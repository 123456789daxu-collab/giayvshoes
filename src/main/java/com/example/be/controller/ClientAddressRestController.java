package com.example.be.controller;

import com.example.be.dto.DiaChiDto;
import com.example.be.entity.DiaChi;
import com.example.be.entity.KhachHang;
import com.example.be.service.DiaChiService;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/client/dia-chi")
public class ClientAddressRestController {

    private final DiaChiService diaChiService;

    public ClientAddressRestController(DiaChiService diaChiService) {
        this.diaChiService = diaChiService;
    }

    // 1. Lấy danh sách địa chỉ của khách hàng đang đăng nhập
    @GetMapping("/list")
    public ResponseEntity<?> getMyAddresses(HttpSession session) {
        KhachHang sessionUser = (KhachHang) session.getAttribute("clientUser");
        if (sessionUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Chưa đăng nhập!"));
        }
        List<DiaChi> list = diaChiService.findByKhachHangId(sessionUser.getId());
        return ResponseEntity.ok(list);
    }

    // 2. Thêm mới hoặc cập nhật địa chỉ
    @PostMapping("/save")
    public ResponseEntity<?> saveAddress(@RequestBody DiaChiDto dto, HttpSession session) {
        KhachHang sessionUser = (KhachHang) session.getAttribute("clientUser");
        if (sessionUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Chưa đăng nhập!"));
        }

        try {
            DiaChi saved;
            if (dto.getId() != null) {
                saved = diaChiService.updateDiaChi(dto.getId(), dto);
            } else {
                saved = diaChiService.addDiaChi(sessionUser.getId(), dto);
            }
            return ResponseEntity.ok(Map.of("success", true, "data", saved, "message", "Lưu địa chỉ thành công!"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // 3. Đặt làm địa chỉ mặc định
    @PostMapping("/set-default/{id}")
    public ResponseEntity<?> setDefaultAddress(@PathVariable("id") Long id, HttpSession session) {
        KhachHang sessionUser = (KhachHang) session.getAttribute("clientUser");
        if (sessionUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Chưa đăng nhập!"));
        }

        try {
            diaChiService.setDefaultDiaChi(id);
            return ResponseEntity.ok(Map.of("success", true, "message", "Đặt địa chỉ mặc định thành công!"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // 4. Xóa địa chỉ
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<?> deleteAddress(@PathVariable("id") Long id, HttpSession session) {
        KhachHang sessionUser = (KhachHang) session.getAttribute("clientUser");
        if (sessionUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Chưa đăng nhập!"));
        }

        try {
            diaChiService.deleteDiaChi(id);
            return ResponseEntity.ok(Map.of("success", true, "message", "Xóa địa chỉ thành công!"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
