package com.example.be.controller;

import com.example.be.entity.*;
import com.example.be.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/thuoc-tinh")
public class ThuocTinhRestController {

    @Autowired
    private DanhMucRepository danhMucRepository;
    @Autowired
    private LoaiGiayRepository loaiGiayRepository;
    @Autowired
    private ThuongHieuRepository thuongHieuRepository;
    @Autowired
    private ChatLieuRepository chatLieuRepository;
    @Autowired
    private MauSacRepository mauSacRepository;
    @Autowired
    private CoGiayRepository coGiayRepository;

    @PostMapping("/add-danh-muc")
    public ResponseEntity<?> addDanhMuc(@RequestParam("ten") String ten) {
        DanhMuc dm = new DanhMuc();
        dm.setMaDanhMuc("DM" + System.currentTimeMillis());
        dm.setTenDanhMuc(ten);
        dm.setTrangThai(true);
        dm = danhMucRepository.save(dm);
        return ResponseEntity.ok(Map.of("id", dm.getId(), "ten", dm.getTenDanhMuc()));
    }

    @PostMapping("/add-loai-giay")
    public ResponseEntity<?> addLoaiGiay(@RequestParam("ten") String ten) {
        LoaiGiay lg = new LoaiGiay();
        lg.setMaLoaiGiay("LG" + System.currentTimeMillis());
        lg.setTenLoaiGiay(ten);
        lg.setTrangThai(true);
        lg = loaiGiayRepository.save(lg);
        return ResponseEntity.ok(Map.of("id", lg.getId(), "ten", lg.getTenLoaiGiay()));
    }

    @PostMapping("/add-thuong-hieu")
    public ResponseEntity<?> addThuongHieu(@RequestParam("ten") String ten) {
        ThuongHieu th = new ThuongHieu();
        th.setMaThuongHieu("TH" + System.currentTimeMillis());
        th.setTenThuongHieu(ten);
        th.setTrangThai(true);
        th = thuongHieuRepository.save(th);
        return ResponseEntity.ok(Map.of("id", th.getId(), "ten", th.getTenThuongHieu()));
    }

    @PostMapping("/add-chat-lieu")
    public ResponseEntity<?> addChatLieu(@RequestParam("ten") String ten) {
        ChatLieu cl = new ChatLieu();
        cl.setMaChatLieu("CL" + System.currentTimeMillis());
        cl.setTenChatLieu(ten);
        cl.setTrangThai(true);
        cl = chatLieuRepository.save(cl);
        return ResponseEntity.ok(Map.of("id", cl.getId(), "ten", cl.getTenChatLieu()));
    }

    @PostMapping("/add-mau-sac")
    public ResponseEntity<?> addMauSac(@RequestParam("ten") String ten) {
        MauSac ms = new MauSac();
        ms.setMaMauSac("MS" + System.currentTimeMillis());
        ms.setTenMauSac(ten);
        ms.setTrangThai(true);
        ms = mauSacRepository.save(ms);
        return ResponseEntity.ok(Map.of("id", ms.getId(), "ten", ms.getTenMauSac()));
    }

    @PostMapping("/add-co-giay")
    public ResponseEntity<?> addCoGiay(@RequestParam("size") Integer size) {
        CoGiay cg = new CoGiay();
        cg.setMaCoGiay("SIZE" + System.currentTimeMillis());
        cg.setSizeGiay(size);
        cg.setTrangThai(true);
        cg = coGiayRepository.save(cg);
        return ResponseEntity.ok(Map.of("id", cg.getId(), "ten", cg.getSizeGiay()));
    }
}
