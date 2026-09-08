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

    @GetMapping("/current")
    public ResponseEntity<?> getCurrentUser(org.springframework.security.core.Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof com.example.be.security.CustomUserDetails userDetails) {
            NhanVien nv = userDetails.getNhanVien();
            if (nv != null && nv.getId() != null) {
                return nhanVienService.findById(nv.getId())
                        .map(ResponseEntity::ok)
                        .orElse(ResponseEntity.ok(nv));
            }
            return ResponseEntity.ok(nv);
        }
        return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).body("Chưa đăng nhập");
    }

    @PutMapping("/current")
    public ResponseEntity<?> updateCurrentProfile(
            @RequestBody java.util.Map<String, Object> payload,
            org.springframework.security.core.Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof com.example.be.security.CustomUserDetails userDetails) {
            NhanVien currentNv = userDetails.getNhanVien();
            Long id = currentNv.getId();
            return nhanVienService.findById(id).map(existing -> {
                String hoTen = payload.get("hoTen") != null ? payload.get("hoTen").toString() : null;
                String email = payload.get("email") != null ? payload.get("email").toString() : null;
                String soDienThoai = payload.get("soDienThoai") != null ? payload.get("soDienThoai").toString() : null;
                String diaChi = payload.get("diaChi") != null ? payload.get("diaChi").toString() : null;
                String cccd = payload.get("cccd") != null ? payload.get("cccd").toString() : null;
                String ngaySinhStr = payload.get("ngaySinh") != null ? payload.get("ngaySinh").toString() : null;
                Object gioiTinhObj = payload.get("gioiTinh");
                String currentPassword = payload.get("currentPassword") != null ? payload.get("currentPassword").toString() : null;
                String newPassword = payload.get("newPassword") != null ? payload.get("newPassword").toString() : null;

                if (hoTen != null && !hoTen.trim().isEmpty()) existing.setHoTen(hoTen.trim());
                if (email != null && !email.trim().isEmpty()) existing.setEmail(email.trim());
                if (soDienThoai != null && !soDienThoai.trim().isEmpty()) existing.setSoDienThoai(soDienThoai.trim());
                if (diaChi != null) existing.setDiaChi(diaChi.trim());
                if (cccd != null) existing.setCccd(cccd.trim());
                if (ngaySinhStr != null && !ngaySinhStr.trim().isEmpty()) {
                    try {
                        existing.setNgaySinh(java.time.LocalDate.parse(ngaySinhStr.trim()));
                    } catch (Exception ignored) {}
                }
                if (gioiTinhObj != null) {
                    existing.setGioiTinh(Boolean.parseBoolean(gioiTinhObj.toString()));
                }

                // Changing password if requested
                if (newPassword != null && !newPassword.trim().isEmpty()) {
                    if (currentPassword == null || !currentPassword.equals(existing.getMatKhau())) {
                        return ResponseEntity.badRequest().body("Mật khẩu hiện tại không chính xác!");
                    }
                    if (newPassword.trim().length() < 6) {
                        return ResponseEntity.badRequest().body("Mật khẩu mới phải có ít nhất 6 ký tự!");
                    }
                    existing.setMatKhau(newPassword.trim());
                }

                NhanVien saved = nhanVienService.save(existing);
                return ResponseEntity.ok(saved);
            }).orElse(ResponseEntity.notFound().build());
        }
        return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).body("Chưa đăng nhập");
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
}
