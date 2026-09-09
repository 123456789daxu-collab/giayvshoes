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

    private static final String RANDOM_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final java.security.SecureRandom RANDOM = new java.security.SecureRandom();

    private String generateNextMaDanhMuc() {
        String code;
        do {
            StringBuilder sb = new StringBuilder("DM");
            for (int i = 0; i < 6; i++) {
                sb.append(RANDOM_CHARS.charAt(RANDOM.nextInt(RANDOM_CHARS.length())));
            }
            code = sb.toString();
        } while (danhMucRepository.existsByMaDanhMuc(code));
        return code;
    }

    private String generateNextMaLoaiGiay() {
        String code;
        do {
            StringBuilder sb = new StringBuilder("LG");
            for (int i = 0; i < 6; i++) {
                sb.append(RANDOM_CHARS.charAt(RANDOM.nextInt(RANDOM_CHARS.length())));
            }
            code = sb.toString();
        } while (loaiGiayRepository.existsByMaLoaiGiay(code));
        return code;
    }

    private String generateNextMaThuongHieu() {
        String code;
        do {
            StringBuilder sb = new StringBuilder("TH");
            for (int i = 0; i < 6; i++) {
                sb.append(RANDOM_CHARS.charAt(RANDOM.nextInt(RANDOM_CHARS.length())));
            }
            code = sb.toString();
        } while (thuongHieuRepository.existsByMaThuongHieu(code));
        return code;
    }

    private String generateNextMaChatLieu() {
        String code;
        do {
            StringBuilder sb = new StringBuilder("CL");
            for (int i = 0; i < 6; i++) {
                sb.append(RANDOM_CHARS.charAt(RANDOM.nextInt(RANDOM_CHARS.length())));
            }
            code = sb.toString();
        } while (chatLieuRepository.existsByMaChatLieu(code));
        return code;
    }

    private String generateNextMaMauSac() {
        String code;
        do {
            StringBuilder sb = new StringBuilder("MS");
            for (int i = 0; i < 6; i++) {
                sb.append(RANDOM_CHARS.charAt(RANDOM.nextInt(RANDOM_CHARS.length())));
            }
            code = sb.toString();
        } while (mauSacRepository.existsByMaMauSac(code));
        return code;
    }

    private String generateNextMaCoGiay() {
        String code;
        do {
            StringBuilder sb = new StringBuilder("CG");
            for (int i = 0; i < 6; i++) {
                sb.append(RANDOM_CHARS.charAt(RANDOM.nextInt(RANDOM_CHARS.length())));
            }
            code = sb.toString();
        } while (coGiayRepository.existsByMaCoGiay(code));
        return code;
    }

    @PostMapping("/add-danh-muc")
    public ResponseEntity<?> addDanhMuc(@RequestParam("ten") String ten) {
        if (isInvalidName(ten)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Tên danh mục không được chứa số hoặc ký tự đặc biệt!"));
        }
        String nameTrim = ten.trim();
        java.util.Optional<DanhMuc> existing = danhMucRepository.findByTenDanhMucIgnoreCase(nameTrim);
        if (existing.isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Danh mục đã tồn tại trong hệ thống!"));
        }

        DanhMuc dm = new DanhMuc();
        dm.setMaDanhMuc(generateNextMaDanhMuc());
        dm.setTenDanhMuc(nameTrim);
        dm.setTrangThai(true);
        dm = danhMucRepository.save(dm);
        return ResponseEntity.ok(Map.of("id", dm.getId(), "ten", dm.getTenDanhMuc()));
    }

    @PostMapping("/add-loai-giay")
    public ResponseEntity<?> addLoaiGiay(@RequestParam("ten") String ten) {
        if (isInvalidName(ten)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Tên loại giày không được chứa số hoặc ký tự đặc biệt!"));
        }
        String nameTrim = ten.trim();
        java.util.Optional<LoaiGiay> existing = loaiGiayRepository.findByTenLoaiGiayIgnoreCase(nameTrim);
        if (existing.isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Loại giày đã tồn tại trong hệ thống!"));
        }

        LoaiGiay lg = new LoaiGiay();
        lg.setMaLoaiGiay(generateNextMaLoaiGiay());
        lg.setTenLoaiGiay(nameTrim);
        lg.setTrangThai(true);
        lg = loaiGiayRepository.save(lg);
        return ResponseEntity.ok(Map.of("id", lg.getId(), "ten", lg.getTenLoaiGiay()));
    }

    @PostMapping("/add-thuong-hieu")
    public ResponseEntity<?> addThuongHieu(@RequestParam("ten") String ten) {
        if (isInvalidName(ten)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Tên thương hiệu không được chứa số hoặc ký tự đặc biệt!"));
        }
        String nameTrim = ten.trim();
        java.util.Optional<ThuongHieu> existing = thuongHieuRepository.findByTenThuongHieuIgnoreCase(nameTrim);
        if (existing.isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Thương hiệu đã tồn tại trong hệ thống!"));
        }

        ThuongHieu th = new ThuongHieu();
        th.setMaThuongHieu(generateNextMaThuongHieu());
        th.setTenThuongHieu(nameTrim);
        th.setTrangThai(true);
        th = thuongHieuRepository.save(th);
        return ResponseEntity.ok(Map.of("id", th.getId(), "ten", th.getTenThuongHieu()));
    }

    @PostMapping("/add-chat-lieu")
    public ResponseEntity<?> addChatLieu(@RequestParam("ten") String ten) {
        if (isInvalidName(ten)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Tên chất liệu không được chứa số hoặc ký tự đặc biệt!"));
        }
        String nameTrim = ten.trim();
        java.util.Optional<ChatLieu> existing = chatLieuRepository.findByTenChatLieuIgnoreCase(nameTrim);
        if (existing.isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Chất liệu đã tồn tại trong hệ thống!"));
        }

        ChatLieu cl = new ChatLieu();
        cl.setMaChatLieu(generateNextMaChatLieu());
        cl.setTenChatLieu(nameTrim);
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

        java.util.Optional<MauSac> existing = mauSacRepository.findByTenMauSacIgnoreCase(trimmedTen);
        if (existing.isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Màu sắc đã tồn tại trong hệ thống!"));
        }

        MauSac ms = new MauSac();
        ms.setMaMauSac(generateNextMaMauSac());
        ms.setTenMauSac(trimmedTen);
        ms.setTrangThai(true);
        if (ma != null && !ma.trim().isEmpty()) {
            ms.setMaHex(ma.trim());
        }
        ms = mauSacRepository.save(ms);
        return ResponseEntity.ok(Map.of("id", ms.getId(), "ten", ms.getTenMauSac(), "ma", ms.getMaMauSac(), "hex", ms.getMaHex() != null ? ms.getMaHex() : ""));
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

        java.util.Optional<CoGiay> existing = coGiayRepository.findBySizeGiay(size);
        if (existing.isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Kích thước đã tồn tại trong hệ thống!"));
        }

        CoGiay cg = new CoGiay();
        cg.setMaCoGiay(generateNextMaCoGiay());
        cg.setSizeGiay(size);
        cg.setTrangThai(true);
        cg = coGiayRepository.save(cg);
        return ResponseEntity.ok(Map.of("id", cg.getId(), "ten", cg.getSizeGiay()));
    }
}
