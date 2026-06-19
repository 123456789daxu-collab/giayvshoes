package com.example.be.controller;

import com.example.be.dto.HoaDonDTO;
import com.example.be.service.HoaDonService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/hoa-don")
public class HoaDonRestController {

    private final HoaDonService hoaDonService;

    public HoaDonRestController(HoaDonService hoaDonService) {
        this.hoaDonService = hoaDonService;
    }

    @GetMapping("/search")
    public ResponseEntity<List<HoaDonDTO>> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer trangThai,
            @RequestParam(required = false) String loaiHoaDon,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
            
        List<HoaDonDTO> results = hoaDonService.search(keyword, trangThai, loaiHoaDon, minPrice, maxPrice, startDate, endDate);
        return ResponseEntity.ok(results);
    }

    @GetMapping("/{id}")
    public ResponseEntity<HoaDonDTO> getById(@PathVariable Long id) {
        return hoaDonService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<HoaDonDTO> create(@RequestBody com.example.be.entity.HoaDon hoaDon) {
        return ResponseEntity.ok(hoaDonService.create(hoaDon));
    }

    @PutMapping("/{id}")
    public ResponseEntity<HoaDonDTO> update(@PathVariable Long id, @RequestBody com.example.be.entity.HoaDon hoaDon) {
        return hoaDonService.update(id, hoaDon)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        hoaDonService.delete(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/init-data")
    public ResponseEntity<String> initData() {
        hoaDonService.generateTestData();
        return ResponseEntity.ok("Đã tạo dữ liệu mẫu thành công!");
    }
}
