package com.example.be.controller;

import com.example.be.entity.LichLamViec;
import com.example.be.service.LichLamViecService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/lich-lam-viec")
public class LichLamViecController {
    private final LichLamViecService lichLamViecService;

    public LichLamViecController(LichLamViecService lichLamViecService) {
        this.lichLamViecService = lichLamViecService;
    }

    @GetMapping
    public ResponseEntity<List<LichLamViec>> getAll() {
        return ResponseEntity.ok(lichLamViecService.findAll());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody LichLamViec lichLamViec) {
        try {
            return ResponseEntity.ok(lichLamViecService.save(lichLamViec));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<LichLamViec> update(@PathVariable Long id, @RequestBody LichLamViec lichLamViec) {
        LichLamViec existing = lichLamViecService.findById(id);
        if (existing != null) {
            existing.setNhanVien(lichLamViec.getNhanVien());
            existing.setCaLam(lichLamViec.getCaLam());
            existing.setNgayLamViec(lichLamViec.getNgayLamViec());
            existing.setGhiChu(lichLamViec.getGhiChu());
            existing.setTrangThai(lichLamViec.getTrangThai());
            return ResponseEntity.ok(lichLamViecService.save(existing));
        }
        return ResponseEntity.notFound().build();
    }

    // KHONG DUNG XOA CUNG (CAP NHAT LICH LAM VIEC / TRANG THAI)
    /*
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        lichLamViecService.deleteById(id);
        return ResponseEntity.ok().build();
    }
    */
}
