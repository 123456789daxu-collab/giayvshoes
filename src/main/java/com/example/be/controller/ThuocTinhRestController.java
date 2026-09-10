package com.example.be.controller;

import com.example.be.entity.*;
import com.example.be.service.ThuocTinhService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/thuoc-tinh")
public class ThuocTinhRestController {

    @Autowired
    private ThuocTinhService thuocTinhService;

    @PostMapping("/add-danh-muc")
    public ResponseEntity<?> addDanhMuc(@RequestParam("ten") String ten) {
        try {
            DanhMuc dm = thuocTinhService.addQuickDanhMuc(ten);
            return ResponseEntity.ok(Map.of("id", dm.getId(), "ten", dm.getTenDanhMuc()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/add-loai-giay")
    public ResponseEntity<?> addLoaiGiay(@RequestParam("ten") String ten) {
        try {
            LoaiGiay lg = thuocTinhService.addQuickLoaiGiay(ten);
            return ResponseEntity.ok(Map.of("id", lg.getId(), "ten", lg.getTenLoaiGiay()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/add-thuong-hieu")
    public ResponseEntity<?> addThuongHieu(@RequestParam("ten") String ten) {
        try {
            ThuongHieu th = thuocTinhService.addQuickThuongHieu(ten);
            return ResponseEntity.ok(Map.of("id", th.getId(), "ten", th.getTenThuongHieu()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/add-chat-lieu")
    public ResponseEntity<?> addChatLieu(@RequestParam("ten") String ten) {
        try {
            ChatLieu cl = thuocTinhService.addQuickChatLieu(ten);
            return ResponseEntity.ok(Map.of("id", cl.getId(), "ten", cl.getTenChatLieu()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/add-mau-sac")
    public ResponseEntity<?> addMauSac(@RequestParam("ten") String ten) {
        try {
            MauSac ms = thuocTinhService.addQuickMauSac(ten);
            return ResponseEntity.ok(Map.of("id", ms.getId(), "ten", ms.getTenMauSac()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/add-kich-thuoc")
    public ResponseEntity<?> addKichThuoc(@RequestParam("ten") String ten) {
        try {
            CoGiay cg = thuocTinhService.addQuickCoGiay(ten);
            return ResponseEntity.ok(Map.of("id", cg.getId(), "ten", cg.getSizeGiay()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
