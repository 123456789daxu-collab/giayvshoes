package com.example.be.controller;

import com.example.be.entity.DotGiamGia;
import com.example.be.service.DotGiamGiaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dot-giam-gia-basic")
public class DotGiamGiaRestController {

    private final DotGiamGiaService dotGiamGiaService;

    public DotGiamGiaRestController(DotGiamGiaService dotGiamGiaService) {
        this.dotGiamGiaService = dotGiamGiaService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> findById(@PathVariable Long id) {
        try {
            DotGiamGia campaign = dotGiamGiaService.findById(id);
            return ResponseEntity.ok(campaign);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
