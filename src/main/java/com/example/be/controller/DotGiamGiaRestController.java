package com.example.be.controller;

import com.example.be.entity.DotGiamGia;
import com.example.be.service.DotGiamGiaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/dot-giam-gia")
public class DotGiamGiaRestController {

    private final DotGiamGiaService dotGiamGiaService;

    public DotGiamGiaRestController(DotGiamGiaService dotGiamGiaService) {
        this.dotGiamGiaService = dotGiamGiaService;
    }

    @GetMapping
    public ResponseEntity<List<DotGiamGia>> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer trangThai) {
        return ResponseEntity.ok(dotGiamGiaService.search(keyword, trangThai));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> findById(@PathVariable Long id) {
        return dotGiamGiaService.findById(id)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.badRequest().body("Không tìm thấy đợt giảm giá"));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody DotGiamGia dotGiamGia) {
        try {
            dotGiamGia.setId(null);
            return ResponseEntity.ok(dotGiamGiaService.save(dotGiamGia));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody DotGiamGia dotGiamGia) {
        try {
            dotGiamGia.setId(id);
            return ResponseEntity.ok(dotGiamGiaService.save(dotGiamGia));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            dotGiamGiaService.deleteById(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}/toggle-trang-thai")
    public ResponseEntity<?> toggleTrangThai(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(dotGiamGiaService.toggleTrangThai(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
