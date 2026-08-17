package com.example.be.controller;

import com.example.be.entity.GiaoCa;
import com.example.be.service.GiaoCaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/giao-ca")
public class GiaoCaController {
    private final GiaoCaService giaoCaService;

    public GiaoCaController(GiaoCaService giaoCaService) {
        this.giaoCaService = giaoCaService;
    }

    @GetMapping
    public ResponseEntity<List<GiaoCa>> getAll() {
        return ResponseEntity.ok(giaoCaService.findAll());
    }

    @PostMapping
    public ResponseEntity<GiaoCa> create(@RequestBody GiaoCa giaoCa) {
        return ResponseEntity.ok(giaoCaService.save(giaoCa));
    }

    @PutMapping("/{id}")
    public ResponseEntity<GiaoCa> update(@PathVariable Long id, @RequestBody GiaoCa giaoCa) {
        GiaoCa existing = giaoCaService.findById(id);
        if (existing != null) {
            existing.setThoiGianGiaoCa(giaoCa.getThoiGianGiaoCa());
            existing.setNhanVienNhan(giaoCa.getNhanVienNhan());
            existing.setTienBanGiao(giaoCa.getTienBanGiao());
            existing.setTienPhatSinh(giaoCa.getTienPhatSinh());
            existing.setGhiChu(giaoCa.getGhiChu());
            existing.setTrangThai(giaoCa.getTrangThai());
            return ResponseEntity.ok(giaoCaService.save(existing));
        }
        return ResponseEntity.notFound().build();
    }
}
