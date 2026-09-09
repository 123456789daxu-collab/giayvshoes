package com.example.be.controller;

import com.example.be.service.MaGeneratorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controller tập trung phục vụ API sinh mã tự động dùng chung cho toàn bộ các màn quản lý
 */
@RestController
public class MaGeneratorController {

    @Autowired
    private MaGeneratorService maGeneratorService;

    /**
     * API chung sinh mã theo kiểu param: /api/common/next-code?type=nhan-vien
     */
    @GetMapping("/api/common/next-code")
    public ResponseEntity<Map<String, String>> getCommonNextCode(@RequestParam(defaultValue = "san-pham") String type) {
        String code = maGeneratorService.generateCodeByType(type);
        return ResponseEntity.ok(Map.of("code", code));
    }

    /**
     * API chung sinh mã theo path variable: /api/ma-tu-dong/khach-hang
     */
    @GetMapping("/api/ma-tu-dong/{type}")
    public ResponseEntity<Map<String, String>> getNextCodeByPath(@PathVariable String type) {
        String code = maGeneratorService.generateCodeByType(type);
        return ResponseEntity.ok(Map.of("code", code));
    }
}
