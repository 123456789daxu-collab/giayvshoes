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
    public ResponseEntity<NhanVien> create(@RequestBody NhanVien nhanVien) {
        return ResponseEntity.ok(nhanVienService.save(nhanVien));
    }

    @PutMapping("/{id}")
    public ResponseEntity<NhanVien> update(@PathVariable Long id, @RequestBody NhanVien nhanVien) {
        return nhanVienService.findById(id)
                .map(existing -> {
                    nhanVien.setId(id);
                    return ResponseEntity.ok(nhanVienService.save(nhanVien));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        nhanVienService.deleteById(id);
        return ResponseEntity.ok().build();
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
    public ResponseEntity<NhanVien> toggleTrangThai(@PathVariable Long id) {
        return ResponseEntity.ok(nhanVienService.toggleTrangThai(id));
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
