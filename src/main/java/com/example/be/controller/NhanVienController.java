package com.example.be.controller;

import com.example.be.entity.NhanVien;
import com.example.be.service.NhanVienService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/nhan-vien")
public class NhanVienController {

    private final NhanVienService nhanVienService;

    public NhanVienController(NhanVienService nhanVienService) {
        this.nhanVienService = nhanVienService;
    }

    @GetMapping
    public ResponseEntity<List<NhanVien>> getAll() {
        return ResponseEntity.ok(nhanVienService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<NhanVien> getById(@PathVariable Long id) {
        return nhanVienService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody NhanVien nhanVien) {
        try {
            return ResponseEntity.ok(nhanVienService.save(nhanVien));
        } catch (Exception e) {
            String msg = e.getMessage();
            return ResponseEntity.badRequest().body(msg != null ? msg : "Đã xảy ra lỗi hệ thống (NullPointerException hoặc tương tự)!");
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody NhanVien nhanVien) {
        try {
            return nhanVienService.findById(id)
                    .map(existing -> {
                        existing.setHoTen(nhanVien.getHoTen());
                        existing.setEmail(nhanVien.getEmail());
                        existing.setSoDienThoai(nhanVien.getSoDienThoai());
                        existing.setChucVu(nhanVien.getChucVu());
                        existing.setTrangThai(nhanVien.getTrangThai());
                        existing.setGioiTinh(nhanVien.getGioiTinh());
                        existing.setNgaySinh(nhanVien.getNgaySinh());
                        existing.setDiaChi(nhanVien.getDiaChi());
                        if (nhanVien.getMatKhau() != null && !nhanVien.getMatKhau().trim().isEmpty()) {
                            existing.setMatKhau(nhanVien.getMatKhau());
                        }
                        if (nhanVien.getAnhDaiDien() != null) {
                            existing.setAnhDaiDien(nhanVien.getAnhDaiDien());
                        }
                        return ResponseEntity.ok(nhanVienService.save(existing));
                    })
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            nhanVienService.deleteById(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/search")
    public ResponseEntity<List<NhanVien>> search(@RequestParam String keyword) {
        return ResponseEntity.ok(nhanVienService.search(keyword));
    }

    @GetMapping("/filter")
    public ResponseEntity<List<NhanVien>> filterByTrangThai(@RequestParam Integer trangThai) {
        return ResponseEntity.ok(nhanVienService.findByTrangThai(trangThai));
    }

    @PutMapping("/{id}/toggle-trang-thai")
    public ResponseEntity<?> toggleTrangThai(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(nhanVienService.toggleTrangThai(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/avatar")
    public ResponseEntity<?> uploadAvatar(@PathVariable Long id, @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        return nhanVienService.findById(id)
                .map(nv -> {
                    if (file.isEmpty()) {
                        return ResponseEntity.badRequest().body("No file provided");
                    }
                    try {
                        String uploadDir = "src/main/resources/static/images/avatars";
                        java.nio.file.Path uploadPath = java.nio.file.Paths.get(uploadDir);
                        if (!java.nio.file.Files.exists(uploadPath)) {
                            java.nio.file.Files.createDirectories(uploadPath);
                        }
                        String filename = "avatar_" + id + "_" + System.currentTimeMillis() + "_" + file.getOriginalFilename();
                        java.nio.file.Path filePath = uploadPath.resolve(filename);
                        java.nio.file.Files.copy(file.getInputStream(), filePath);
                        nv.setAnhDaiDien("/images/avatars/" + filename);
                        nhanVienService.save(nv);
                        return ResponseEntity.ok().build();
                    } catch (Exception e) {
                        return ResponseEntity.status(500).body("Failed to upload avatar: " + e.getMessage());
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/next-code")
    public ResponseEntity<?> getNextCode() {
        try {
            return ResponseEntity.ok(java.util.Map.of("code", nhanVienService.getNextMaNhanVien()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", e.getMessage()));
        }
    }
}
