package com.example.be.controller;

import com.example.be.service.SanPhamService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/san-pham")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE})
public class SanPhamRestController {

    private final SanPhamService sanPhamService;

    public SanPhamRestController(SanPhamService sanPhamService) {
        this.sanPhamService = sanPhamService;
    }

    @GetMapping("/next-code")
    public ResponseEntity<?> getNextCode() {
        return ResponseEntity.ok(Map.of("code", sanPhamService.generateNextMaSanPham()));
    }

    @GetMapping("/flash-sale")
    public ResponseEntity<Map<String, Object>> getFlashSaleData() {
        return ResponseEntity.ok(sanPhamService.getFlashSaleData());
    }

    @PostMapping("/check-cart-status")
    public ResponseEntity<List<Map<String, Object>>> checkCartStatus(@RequestBody List<Long> spctIds) {
        return ResponseEntity.ok(sanPhamService.checkCartStatus(spctIds));
    }

    @GetMapping("/search-sale")
    public ResponseEntity<List<Map<String, Object>>> searchForSale(
            @RequestParam(required = false, defaultValue = "") String keyword) {
        return ResponseEntity.ok(sanPhamService.searchForSale(keyword));
    }

    @GetMapping("/detail-by-spct/{spctId}")
    public ResponseEntity<?> getDetailBySpctId(@PathVariable Long spctId) {
        try {
            Map<String, Object> response = sanPhamService.getDetailBySpctId(spctId);
            if (response == null) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/reduce-stock/{id}")
    public ResponseEntity<?> reduceStock(@PathVariable Long id, @RequestParam Integer quantity) {
        try {
            Map<String, Object> result = sanPhamService.reduceStock(id, quantity);
            if (result == null) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/increase-stock/{id}")
    public ResponseEntity<?> increaseStock(@PathVariable Long id, @RequestParam Integer quantity) {
        Map<String, Object> result = sanPhamService.increaseStock(id, quantity);
        if (result == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(result);
    }
}
