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

    @GetMapping("/{id}/items")
    public ResponseEntity<List<java.util.Map<String, Object>>> getItems(@PathVariable Long id) {
        List<java.util.Map<String, Object>> items = hoaDonService.getItemsByHoaDonId(id);
        return ResponseEntity.ok(items);
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<List<java.util.Map<String, Object>>> getHistory(@PathVariable Long id) {
        List<com.example.be.entity.LichSuHoaDon> historyList = hoaDonService.getHistoryByHoaDonId(id);
        List<java.util.Map<String, Object>> response = historyList.stream().map(h -> {
            java.util.Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", h.getId());
            map.put("hanhDong", h.getHanhDong());
            map.put("ngayTao", h.getNgayTao());
            map.put("ghiChu", h.getGhiChu());
            return map;
        }).collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> export(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer trangThai,
            @RequestParam(required = false) String loaiHoaDon,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) throws java.io.IOException {
            
        byte[] bytes = hoaDonService.exportInvoicesToExcel(keyword, trangThai, loaiHoaDon, minPrice, maxPrice, startDate, endDate);
        
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.set(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"danh_sach_hoa_don.xlsx\"");
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");
        
        return new ResponseEntity<>(bytes, headers, org.springframework.http.HttpStatus.OK);
    }

    @PostMapping("/init-data")
    public ResponseEntity<String> initData() {
        hoaDonService.generateTestData();
        return ResponseEntity.ok("Đã tạo dữ liệu mẫu thành công!");
    }
}
