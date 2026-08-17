package com.example.be.controller;

import com.example.be.entity.KhachHang;
import com.example.be.repository.KhachHangRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final KhachHangRepository khachHangRepository;
    private final com.example.be.repository.DiaChiRepository diaChiRepository;
    private final com.example.be.repository.HoaDonRepository hoaDonRepository;
    private final com.example.be.service.HoaDonService hoaDonService;

    public AuthController(KhachHangRepository khachHangRepository,
                          com.example.be.repository.DiaChiRepository diaChiRepository,
                          com.example.be.repository.HoaDonRepository hoaDonRepository,
                          com.example.be.service.HoaDonService hoaDonService) {
        this.khachHangRepository = khachHangRepository;
        this.diaChiRepository = diaChiRepository;
        this.hoaDonRepository = hoaDonRepository;
        this.hoaDonService = hoaDonService;
    }

    /**
     * Cập nhật thông tin cá nhân khách hàng.
     * POST /api/auth/update-profile
     */
    @PostMapping("/update-profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> payload, HttpSession session) {
        KhachHang sessionUser = (KhachHang) session.getAttribute("clientUser");
        if (sessionUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Chưa đăng nhập!"));
        }

        KhachHang kh = khachHangRepository.findById(sessionUser.getId()).orElse(sessionUser);

        String hoTen = payload.get("hoTen");
        String email = payload.get("email");
        String soDienThoai = payload.get("soDienThoai");
        String ngaySinhStr = payload.get("ngaySinh");
        String gioiTinhStr = payload.get("gioiTinh");
        String diaChiChiTiet = payload.get("diaChi");

        if (hoTen != null && !hoTen.isBlank()) kh.setHoTen(hoTen.trim());
        if (email != null && !email.isBlank()) kh.setEmail(email.trim());
        if (soDienThoai != null && !soDienThoai.isBlank()) kh.setSoDienThoai(soDienThoai.trim());
        if (gioiTinhStr != null) kh.setGioiTinh("true".equalsIgnoreCase(gioiTinhStr) || "1".equals(gioiTinhStr));

        if (ngaySinhStr != null && !ngaySinhStr.isBlank()) {
            try {
                kh.setNgaySinh(LocalDate.parse(ngaySinhStr.trim()));
            } catch (Exception ignored) {}
        }

        KhachHang saved = khachHangRepository.save(kh);
        session.setAttribute("clientUser", saved);

        // Update default address
        if (diaChiChiTiet != null && !diaChiChiTiet.isBlank()) {
            com.example.be.entity.DiaChi dc = diaChiRepository.findByKhachHangIdAndMacDinhTrue(saved.getId())
                    .orElse(com.example.be.entity.DiaChi.builder()
                            .khachHang(saved)
                            .macDinh(true)
                            .loaiDiaChi("Nhà riêng")
                            .build());
            dc.setTenNguoiNhan(saved.getHoTen());
            dc.setSdt(saved.getSoDienThoai());
            dc.setDiaChiChiTiet(diaChiChiTiet.trim());
            diaChiRepository.save(dc);
        }

        return ResponseEntity.ok(Map.of("success", true, "message", "Cập nhật thông tin thành công!", "user", saved));
    }

    /**
     * Đổi mật khẩu.
     * POST /api/auth/change-password
     */
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> payload, HttpSession session) {
        KhachHang sessionUser = (KhachHang) session.getAttribute("clientUser");
        if (sessionUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Chưa đăng nhập!"));
        }

        String oldPass = payload.get("oldPassword");
        String newPass = payload.get("newPassword");

        if (oldPass == null || newPass == null || newPass.trim().length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("message", "Mật khẩu mới phải có ít nhất 6 ký tự!"));
        }

        KhachHang kh = khachHangRepository.findById(sessionUser.getId()).orElse(sessionUser);
        if (!kh.getMatKhau().equals(oldPass.trim())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Mật khẩu hiện tại không chính xác!"));
        }

        kh.setMatKhau(newPass.trim());
        KhachHang saved = khachHangRepository.save(kh);
        session.setAttribute("clientUser", saved);

        return ResponseEntity.ok(Map.of("success", true, "message", "Đổi mật khẩu thành công!"));
    }

    /**
     * Lấy danh sách đơn hàng của khách hàng đang đăng nhập.
     * GET /api/auth/my-orders
     */
    @GetMapping("/my-orders")
    public ResponseEntity<?> getMyOrders(HttpSession session) {
        KhachHang sessionUser = (KhachHang) session.getAttribute("clientUser");
        if (sessionUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Chưa đăng nhập!"));
        }

        List<com.example.be.entity.HoaDon> list = hoaDonRepository.findByKhachHangIdOrSdtNguoiNhan(sessionUser.getId(), sessionUser.getSoDienThoai());
        List<com.example.be.dto.HoaDonDTO> dtoList = list.stream()
                .map(h -> hoaDonService.findById(h.getId()).orElse(null))
                .filter(Objects::nonNull)
                .collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(dtoList);
    }

    /**
     * Hủy đơn hàng của khách hàng.
     * POST /api/auth/cancel-order/{id}
     */
    @PostMapping("/cancel-order/{id}")
    public ResponseEntity<?> cancelOrder(@PathVariable Long id, @RequestBody(required = false) Map<String, String> payload, HttpSession session) {
        String reason = payload != null && payload.get("reason") != null ? payload.get("reason") : "Khách hàng tự hủy trên website";
        try {
            com.example.be.dto.HoaDonDTO updatedDto = hoaDonService.cancelOrderByCustomer(id, reason);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", updatedDto.getTrangThai() == 8 
                    ? "Đã gửi yêu cầu hủy đơn hàng thành công! Quản trị viên sẽ xử lý yêu cầu của bạn." 
                    : "Đã hủy đơn hàng thành công!",
                "data", updatedDto
            ));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", ex.getMessage()));
        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("success", false, "message", "Lỗi xử lý: " + ex.getMessage()));
        }
    }

    /**
     * Đăng ký tài khoản khách hàng mới.
     * POST /api/auth/dang-ky
     */
    @PostMapping("/dang-ky")
    public ResponseEntity<?> register(@RequestBody Map<String, String> payload, HttpSession session) {
        String hoTen = payload.get("hoTen");
        String email = payload.get("email");
        String soDienThoai = payload.get("soDienThoai");
        String matKhau = payload.get("matKhau");
        String ngaySinhStr = payload.get("ngaySinh");
        String gioiTinhStr = payload.get("gioiTinh");
        String diaChi = payload.get("diaChi");

        Map<String, String> errors = new LinkedHashMap<>();

        // Validate Ho ten
        if (hoTen == null || hoTen.trim().isEmpty()) {
            errors.put("hoTen", "Họ và tên không được để trống!");
        } else if (hoTen.trim().length() < 2 || hoTen.trim().length() > 100) {
            errors.put("hoTen", "Họ và tên phải từ 2 đến 100 ký tự!");
        }

        // Validate Email
        if (email == null || email.trim().isEmpty()) {
            errors.put("email", "Email không được để trống!");
        } else {
            String emailRegex = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,6}$";
            if (!email.trim().matches(emailRegex)) {
                errors.put("email", "Địa chỉ email không đúng định dạng!");
            } else if (khachHangRepository.existsByEmail(email.trim())) {
                errors.put("email", "Địa chỉ email này đã được sử dụng!");
            }
        }

        // Validate So dien thoai
        if (soDienThoai == null || soDienThoai.trim().isEmpty()) {
            errors.put("soDienThoai", "Số điện thoại không được để trống!");
        } else {
            String phoneRegex = "^(0[35789])[0-9]{8}$";
            if (!soDienThoai.trim().matches(phoneRegex)) {
                errors.put("soDienThoai", "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng đầu số VN (03, 05, 07, 08, 09)!");
            } else if (khachHangRepository.existsBySoDienThoai(soDienThoai.trim())) {
                errors.put("soDienThoai", "Số điện thoại này đã được sử dụng!");
            }
        }

        // Validate Mat khau
        if (matKhau == null || matKhau.trim().isEmpty()) {
            errors.put("matKhau", "Mật khẩu không được để trống!");
        } else if (matKhau.trim().length() < 6) {
            errors.put("matKhau", "Mật khẩu phải chứa ít nhất 6 ký tự!");
        }

        // Validate Ngay sinh
        LocalDate ngaySinh = null;
        if (ngaySinhStr != null && !ngaySinhStr.trim().isEmpty()) {
            try {
                ngaySinh = LocalDate.parse(ngaySinhStr.trim());
                if (ngaySinh.isAfter(LocalDate.now())) {
                    errors.put("ngaySinh", "Ngày sinh không được ở tương lai!");
                }
            } catch (Exception e) {
                errors.put("ngaySinh", "Ngày sinh không hợp lệ (định dạng yyyy-MM-dd)!");
            }
        }

        // Validate Gioi tinh
        Boolean gioiTinh = true;
        if (gioiTinhStr != null && !gioiTinhStr.trim().isEmpty()) {
            gioiTinh = Boolean.parseBoolean(gioiTinhStr.trim());
        }

        if (!errors.isEmpty()) {
            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("success", false);
            resp.put("message", errors.values().iterator().next());
            resp.put("errors", errors);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(resp);
        }

        // Tự sinh mã khách hàng KHxxxxx
        String prefix = "KH";
        Optional<KhachHang> lastKh = khachHangRepository.findFirstByMaKhachHangStartingWithOrderByMaKhachHangDesc(prefix);
        String newCode = "KH00001";
        if (lastKh.isPresent()) {
            String lastCode = lastKh.get().getMaKhachHang();
            try {
                int num = Integer.parseInt(lastCode.substring(2));
                newCode = String.format("KH%05d", num + 1);
            } catch (Exception e) {
                newCode = "KH" + (System.currentTimeMillis() % 100000);
            }
        }

        KhachHang kh = KhachHang.builder()
                .maKhachHang(newCode)
                .hoTen(hoTen.trim())
                .email(email.trim())
                .soDienThoai(soDienThoai.trim())
                .matKhau(matKhau.trim())
                .ngaySinh(ngaySinh)
                .gioiTinh(gioiTinh)
                .trangThai(1) // 1 = Active
                .ngayTao(java.time.LocalDateTime.now())
                .build();

        try {
            KhachHang saved = khachHangRepository.save(kh);

            if (diaChi != null && !diaChi.isBlank()) {
                com.example.be.entity.DiaChi dc = com.example.be.entity.DiaChi.builder()
                        .khachHang(saved)
                        .tenNguoiNhan(hoTen.trim())
                        .sdt(soDienThoai.trim())
                        .diaChiChiTiet(diaChi.trim())
                        .loaiDiaChi("Nhà riêng")
                        .macDinh(true)
                        .ngayTao(java.time.LocalDateTime.now())
                        .build();
                diaChiRepository.save(dc);
            }

            // Auto log in on successful registration
            session.setAttribute("clientUser", saved);

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("success", true);
            resp.put("message", "Đăng ký tài khoản thành công!");
            resp.put("user", saved);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            e.printStackTrace();
            System.err.println("[AuthController] Lỗi khi lưu khách hàng mới: " + e.getMessage());
            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("success", false);
            resp.put("message", "Đăng ký thất bại: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(resp);
        }
    }

    /**
     * Đăng nhập tài khoản khách hàng.
     * POST /api/auth/dang-nhap
     */
    @PostMapping("/dang-nhap")
    public ResponseEntity<?> login(@RequestBody Map<String, String> payload, HttpSession session) {
        String emailOrPhone = payload.get("emailOrPhone");
        String matKhau = payload.get("matKhau");

        if (emailOrPhone == null || emailOrPhone.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Vui lòng nhập Email hoặc Số điện thoại!"));
        }
        if (matKhau == null || matKhau.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Vui lòng nhập mật khẩu!"));
        }

        String credential = emailOrPhone.trim();
        Optional<KhachHang> opt = Optional.empty();

        if (credential.contains("@")) {
            List<KhachHang> list = khachHangRepository.findAllByEmail(credential);
            if (!list.isEmpty()) {
                opt = list.stream().filter(k -> k.getMatKhau() != null && matKhau.trim().equals(k.getMatKhau())).findFirst();
                if (opt.isEmpty()) opt = Optional.of(list.get(0));
            }
        } else {
            List<KhachHang> list = khachHangRepository.findAllBySoDienThoai(credential);
            if (!list.isEmpty()) {
                opt = list.stream().filter(k -> k.getMatKhau() != null && matKhau.trim().equals(k.getMatKhau())).findFirst();
                if (opt.isEmpty()) opt = Optional.of(list.get(0));
            }
        }


        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Tài khoản không tồn tại!"));
        }

        KhachHang kh = opt.get();
        if (!kh.getMatKhau().equals(matKhau.trim())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Mật khẩu không chính xác!"));
        }

        if (kh.getTrangThai() == null || kh.getTrangThai() != 1) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động!"));
        }

        // Set session
        session.setAttribute("clientUser", kh);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("success", true);
        resp.put("message", "Đăng nhập thành công!");
        resp.put("user", kh);
        return ResponseEntity.ok(resp);
    }

    /**
     * Lấy thông tin khách hàng đang đăng nhập hiện tại.
     * GET /api/auth/current-user
     */
    @GetMapping("/current-user")
    public ResponseEntity<?> getCurrentUser(HttpSession session) {
        KhachHang kh = (KhachHang) session.getAttribute("clientUser");
        Map<String, Object> resp = new LinkedHashMap<>();
        if (kh == null) {
            resp.put("loggedIn", false);
            return ResponseEntity.ok(resp);
        }

        String userAddress = "";
        java.util.Optional<com.example.be.entity.DiaChi> defaultDc = diaChiRepository.findByKhachHangIdAndMacDinhTrue(kh.getId());
        if (defaultDc.isPresent()) {
            userAddress = defaultDc.get().getDiaChiChiTiet();
        }

        resp.put("loggedIn", true);
        Map<String, Object> userMap = new LinkedHashMap<>();
        userMap.put("id", kh.getId());
        userMap.put("maKhachHang", kh.getMaKhachHang() != null ? kh.getMaKhachHang() : "");
        userMap.put("hoTen", kh.getHoTen() != null ? kh.getHoTen() : "");
        userMap.put("email", kh.getEmail() != null ? kh.getEmail() : "");
        userMap.put("soDienThoai", kh.getSoDienThoai() != null ? kh.getSoDienThoai() : "");
        userMap.put("diaChi", userAddress);
        userMap.put("ngaySinh", kh.getNgaySinh() != null ? kh.getNgaySinh().toString() : "");
        userMap.put("gioiTinh", kh.getGioiTinh() != null ? kh.getGioiTinh() : true);
        resp.put("user", userMap);
        return ResponseEntity.ok(resp);
    }

    /**
     * Đăng xuất.
     * POST /api/auth/dang-xuat
     */
    @PostMapping("/dang-xuat")
    public ResponseEntity<?> logout(HttpSession session) {
        session.invalidate();
        return ResponseEntity.ok(Map.of("success", true, "message", "Đăng xuất thành công!"));
    }
}
