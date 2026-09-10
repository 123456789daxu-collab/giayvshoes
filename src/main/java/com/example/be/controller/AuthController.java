package com.example.be.controller;

import com.example.be.dto.HoaDonDTO;
import com.example.be.entity.KhachHang;
import com.example.be.service.AuthService;
import com.example.be.service.HoaDonService;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final HoaDonService hoaDonService;

    public AuthController(AuthService authService, HoaDonService hoaDonService) {
        this.authService = authService;
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

        try {
            KhachHang saved = authService.updateProfile(sessionUser.getId(), payload);
            session.setAttribute("clientUser", saved);
            return ResponseEntity.ok(Map.of("success", true, "message", "Cập nhật thông tin thành công!", "user", saved));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
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

        try {
            authService.changePassword(sessionUser.getId(), payload.get("oldPassword"), payload.get("newPassword"));
            sessionUser.setMatKhau(payload.get("newPassword").trim());
            session.setAttribute("clientUser", sessionUser);
            return ResponseEntity.ok(Map.of("success", true, "message", "Đổi mật khẩu thành công!"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
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

        List<HoaDonDTO> dtoList = authService.getMyOrders(sessionUser.getId(), sessionUser.getSoDienThoai());
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
            HoaDonDTO updatedDto = hoaDonService.cancelOrderByCustomer(id, reason);
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
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("success", false, "message", "Lỗi xử lý: " + ex.getMessage()));
        }
    }

    /**
     * Đăng ký tài khoản khách hàng mới.
     * POST /api/auth/dang-ky
     */
    @PostMapping("/dang-ky")
    public ResponseEntity<?> register(@RequestBody Map<String, String> payload, HttpSession session) {
        try {
            KhachHang saved = authService.register(payload);
            session.setAttribute("clientUser", saved);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Đăng ký tài khoản thành công!",
                "user", saved
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("success", false, "message", "Đăng ký thất bại: " + e.getMessage()));
        }
    }

    /**
     * Đăng nhập tài khoản khách hàng.
     * POST /api/auth/dang-nhap
     */
    @PostMapping("/dang-nhap")
    public ResponseEntity<?> login(@RequestBody Map<String, String> payload, HttpSession session) {
        try {
            KhachHang kh = authService.login(payload.get("emailOrPhone"), payload.get("matKhau"));
            session.setAttribute("clientUser", kh);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Đăng nhập thành công!",
                "user", kh
            ));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Lấy thông tin khách hàng đang đăng nhập hiện tại.
     * GET /api/auth/current-user
     */
    @GetMapping("/current-user")
    public ResponseEntity<?> getCurrentUser(HttpSession session) {
        KhachHang kh = (KhachHang) session.getAttribute("clientUser");
        return ResponseEntity.ok(authService.getCurrentUserInfo(kh));
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
