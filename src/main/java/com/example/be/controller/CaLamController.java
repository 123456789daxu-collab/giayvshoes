package com.example.be.controller;

import com.example.be.entity.CaLam;
import com.example.be.service.CaLamService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ca-lam")
public class CaLamController {
    private final CaLamService caLamService;

    public CaLamController(CaLamService caLamService) {
        this.caLamService = caLamService;
    }

    @GetMapping
    public ResponseEntity<List<CaLam>> getAll() {
        return ResponseEntity.ok(caLamService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CaLam> getById(@PathVariable Long id) {
        CaLam caLam = caLamService.findById(id);
        return caLam != null ? ResponseEntity.ok(caLam) : ResponseEntity.notFound().build();
    }

    @GetMapping("/next-code")
    public ResponseEntity<?> getNextCode() {
        return ResponseEntity.ok(java.util.Map.of("code", caLamService.generateNextMaCa()));
    }

    @PostMapping
    public ResponseEntity<CaLam> create(@RequestBody CaLam caLam) {
        if (caLam.getMaCa() == null || caLam.getMaCa().trim().isEmpty() || "(Tự động sinh)".equals(caLam.getMaCa().trim())) {
            caLam.setMaCa(caLamService.generateNextMaCa());
        }
        return ResponseEntity.ok(caLamService.save(caLam));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CaLam> update(@PathVariable Long id, @RequestBody CaLam caLam) {
        CaLam existing = caLamService.findById(id);
        if (existing != null) {
            existing.setMaCa(caLam.getMaCa());
            existing.setTenCa(caLam.getTenCa());
            existing.setThoiGianBatDau(caLam.getThoiGianBatDau());
            existing.setThoiGianKetThuc(caLam.getThoiGianKetThuc());
            existing.setTrangThai(caLam.getTrangThai());
            return ResponseEntity.ok(caLamService.save(existing));
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        caLamService.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
