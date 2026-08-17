package com.example.be.controller;

import com.example.be.dto.DiaChiDto;
import com.example.be.entity.DiaChi;
import com.example.be.entity.KhachHang;
import com.example.be.repository.DiaChiRepository;
import com.example.be.repository.KhachHangRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/client/dia-chi")
public class ClientAddressRestController {

    private final DiaChiRepository diaChiRepository;
    private final KhachHangRepository khachHangRepository;

    public ClientAddressRestController(DiaChiRepository diaChiRepository, KhachHangRepository khachHangRepository) {
        this.diaChiRepository = diaChiRepository;
        this.khachHangRepository = khachHangRepository;
    }

    // 1. Lấy danh sách địa chỉ của khách hàng đang đăng nhập
    @GetMapping("/list")
    public ResponseEntity<?> getMyAddresses(HttpSession session) {
        KhachHang sessionUser = (KhachHang) session.getAttribute("clientUser");
        if (sessionUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Chưa đăng nhập!"));
        }
        List<DiaChi> list = diaChiRepository.findByKhachHangId(sessionUser.getId());
        return ResponseEntity.ok(list);
    }

    // 2. Thêm mới hoặc cập nhật địa chỉ
    @PostMapping("/save")
    public ResponseEntity<?> saveAddress(@RequestBody DiaChiDto dto, HttpSession session) {
        KhachHang sessionUser = (KhachHang) session.getAttribute("clientUser");
        if (sessionUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Chưa đăng nhập!"));
        }

        KhachHang kh = khachHangRepository.findById(sessionUser.getId()).orElse(sessionUser);
        List<DiaChi> existingList = diaChiRepository.findByKhachHangId(kh.getId());

        DiaChi diaChi;
        if (dto.getId() != null) {
            diaChi = diaChiRepository.findById(dto.getId()).orElseThrow(() -> new RuntimeException("Địa chỉ không tồn tại!"));
        } else {
            diaChi = new DiaChi();
            diaChi.setKhachHang(kh);
            diaChi.setNgayTao(LocalDateTime.now());
        }

        diaChi.setTenNguoiNhan(dto.getTenNguoiNhan() != null && !dto.getTenNguoiNhan().isBlank() ? dto.getTenNguoiNhan().trim() : kh.getHoTen());
        diaChi.setSdt(dto.getSdt() != null && !dto.getSdt().isBlank() ? dto.getSdt().trim() : kh.getSoDienThoai());
        diaChi.setTinhThanh(dto.getTinhThanh() != null ? dto.getTinhThanh().trim() : null);
        diaChi.setQuanHuyen(dto.getQuanHuyen() != null ? dto.getQuanHuyen().trim() : null);
        diaChi.setPhuongXa(dto.getPhuongXa() != null ? dto.getPhuongXa().trim() : null);
        diaChi.setDiaChiChiTiet(dto.getDiaChiChiTiet() != null ? dto.getDiaChiChiTiet().trim() : "");
        diaChi.setLoaiDiaChi(dto.getLoaiDiaChi() != null && !dto.getLoaiDiaChi().isBlank() ? dto.getLoaiDiaChi().trim() : "Nhà riêng");

        boolean setAsDefault = Boolean.TRUE.equals(dto.getMacDinh()) || existingList.isEmpty();
        if (setAsDefault) {
            for (DiaChi dc : existingList) {
                if (diaChi.getId() == null || !dc.getId().equals(diaChi.getId())) {
                    dc.setMacDinh(false);
                    diaChiRepository.save(dc);
                }
            }
            diaChi.setMacDinh(true);
        } else {
            diaChi.setMacDinh(false);
        }

        DiaChi saved = diaChiRepository.save(diaChi);
        return ResponseEntity.ok(Map.of("success", true, "data", saved, "message", "Lưu địa chỉ thành công!"));
    }

    // 3. Đặt làm địa chỉ mặc định
    @PostMapping("/set-default/{id}")
    public ResponseEntity<?> setDefaultAddress(@PathVariable("id") Long id, HttpSession session) {
        KhachHang sessionUser = (KhachHang) session.getAttribute("clientUser");
        if (sessionUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Chưa đăng nhập!"));
        }

        List<DiaChi> list = diaChiRepository.findByKhachHangId(sessionUser.getId());
        boolean found = false;

        for (DiaChi dc : list) {
            if (dc.getId().equals(id)) {
                dc.setMacDinh(true);
                diaChiRepository.save(dc);
                found = true;
            } else if (Boolean.TRUE.equals(dc.getMacDinh())) {
                dc.setMacDinh(false);
                diaChiRepository.save(dc);
            }
        }

        if (!found) {
            return ResponseEntity.badRequest().body(Map.of("message", "Không tìm thấy địa chỉ!"));
        }
        return ResponseEntity.ok(Map.of("success", true, "message", "Đặt địa chỉ mặc định thành công!"));
    }

    // 4. Xóa địa chỉ
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<?> deleteAddress(@PathVariable("id") Long id, HttpSession session) {
        KhachHang sessionUser = (KhachHang) session.getAttribute("clientUser");
        if (sessionUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Chưa đăng nhập!"));
        }

        Optional<DiaChi> opt = diaChiRepository.findById(id);
        if (opt.isEmpty() || !opt.get().getKhachHang().getId().equals(sessionUser.getId())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Không tìm thấy địa chỉ!"));
        }

        DiaChi toDelete = opt.get();
        boolean wasDefault = Boolean.TRUE.equals(toDelete.getMacDinh());
        diaChiRepository.delete(toDelete);

        if (wasDefault) {
            List<DiaChi> remaining = diaChiRepository.findByKhachHangId(sessionUser.getId());
            if (!remaining.isEmpty()) {
                DiaChi newDefault = remaining.get(0);
                newDefault.setMacDinh(true);
                diaChiRepository.save(newDefault);
            }
        }

        return ResponseEntity.ok(Map.of("success", true, "message", "Xóa địa chỉ thành công!"));
    }
}
