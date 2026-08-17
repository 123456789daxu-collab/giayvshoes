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

    private boolean isInvalidName(String name) {
        if (name == null || name.trim().isEmpty()) {
            return true;
        }
        return !name.trim().matches("^[\\p{L}\\d\\s]+$");
    }

    @PostMapping("/add-danh-muc")
    public ResponseEntity<?> addDanhMuc(@RequestParam("ten") String ten) {
        if (isInvalidName(ten)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Tên danh mục không được chứa số hoặc ký tự đặc biệt!"));
        }
        DanhMuc dm = new DanhMuc();
        dm.setMaDanhMuc("DM" + System.currentTimeMillis());
        dm.setTenDanhMuc(ten.trim());
        dm.setTrangThai(true);
        dm = danhMucRepository.save(dm);
        return ResponseEntity.ok(Map.of("id", dm.getId(), "ten", dm.getTenDanhMuc()));
    }

    @PostMapping("/add-loai-giay")
    public ResponseEntity<?> addLoaiGiay(@RequestParam("ten") String ten) {
        if (isInvalidName(ten)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Tên loại giày không được chứa số hoặc ký tự đặc biệt!"));
        }
        LoaiGiay lg = new LoaiGiay();
        lg.setMaLoaiGiay("LG" + System.currentTimeMillis());
        lg.setTenLoaiGiay(ten.trim());
        lg.setTrangThai(true);
        lg = loaiGiayRepository.save(lg);
        return ResponseEntity.ok(Map.of("id", lg.getId(), "ten", lg.getTenLoaiGiay()));
    }

    @PostMapping("/add-thuong-hieu")
    public ResponseEntity<?> addThuongHieu(@RequestParam("ten") String ten) {
        if (isInvalidName(ten)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Tên thương hiệu không được chứa số hoặc ký tự đặc biệt!"));
        }
        ThuongHieu th = new ThuongHieu();
        th.setMaThuongHieu("TH" + System.currentTimeMillis());
        th.setTenThuongHieu(ten.trim());
        th.setTrangThai(true);
        th = thuongHieuRepository.save(th);
        return ResponseEntity.ok(Map.of("id", th.getId(), "ten", th.getTenThuongHieu()));
    }

    @PostMapping("/add-chat-lieu")
    public ResponseEntity<?> addChatLieu(@RequestParam("ten") String ten) {
        if (isInvalidName(ten)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Tên chất liệu không được chứa số hoặc ký tự đặc biệt!"));
        }
        ChatLieu cl = new ChatLieu();
        cl.setMaChatLieu("CL" + System.currentTimeMillis());
        cl.setTenChatLieu(ten.trim());
        cl.setTrangThai(true);
        cl = chatLieuRepository.save(cl);
        return ResponseEntity.ok(Map.of("id", cl.getId(), "ten", cl.getTenChatLieu()));
    }

    @PostMapping("/add-mau-sac")
    public ResponseEntity<?> addMauSac(@RequestParam("ten") String ten, @RequestParam(value = "ma", required = false) String ma) {
        if (ten == null || ten.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Vui lòng nhập tên màu sắc!"));
        }
        String trimmedTen = ten.trim();
        if (trimmedTen.matches("^\\d+$")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Tên màu sắc không được chỉ chứa số!"));
        }
        if (!trimmedTen.matches("^[\\p{L}\\d\\s#-]+$")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Tên màu sắc chứa ký tự đặc biệt không hợp lệ!"));
        }
        if (trimmedTen.startsWith("#") && !trimmedTen.matches("^#[0-9A-Fa-f]{6}$")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Mã màu Hex phải có dạng #RRGGBB (ví dụ: #FF0000)!"));
        }
        if (ma != null && !ma.trim().isEmpty()) {
            if (!ma.trim().matches("^#[0-9A-Fa-f]{6}$")) {
                return ResponseEntity.badRequest().body(Map.of("message", "Mã màu không hợp lệ! Phải có dạng #RRGGBB (ví dụ: #FF0000)."));
            }
        }
        MauSac ms = new MauSac();
        if (ma != null && !ma.trim().isEmpty()) {
            ms.setMaMauSac(ma.trim());
        } else {
            ms.setMaMauSac("MS" + System.currentTimeMillis());
        }
        ms.setTenMauSac(ten.trim());
        ms.setTrangThai(true);
        ms = mauSacRepository.save(ms);
        return ResponseEntity.ok(Map.of("id", ms.getId(), "ten", ms.getTenMauSac(), "ma", ms.getMaMauSac()));
    }

    @PostMapping("/add-co-giay")
    public ResponseEntity<?> addCoGiay(@RequestParam("size") String sizeParam) {
        if (sizeParam == null || !sizeParam.trim().matches("^\\d+$")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Kích cỡ phải là số nguyên từ 35 đến 48 và không chứa ký tự đặc biệt!"));
        }
        int size = Integer.parseInt(sizeParam.trim());
        if (size < 35 || size > 48) {
            return ResponseEntity.badRequest().body(Map.of("message", "Kích cỡ phải nằm trong khoảng từ 35 đến 48!"));
        }
        CoGiay cg = new CoGiay();
        cg.setMaCoGiay("SIZE" + System.currentTimeMillis());
        cg.setSizeGiay(size);
        cg.setTrangThai(true);
        cg = coGiayRepository.save(cg);
        return ResponseEntity.ok(Map.of("id", cg.getId(), "ten", cg.getSizeGiay()));
    }
}
