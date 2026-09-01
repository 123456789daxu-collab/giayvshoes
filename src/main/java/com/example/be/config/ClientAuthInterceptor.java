package com.example.be.config;

import com.example.be.entity.KhachHang;
import com.example.be.repository.KhachHangRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Optional;

@Component
public class ClientAuthInterceptor implements HandlerInterceptor {

    @Autowired
    private KhachHangRepository khachHangRepository;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        HttpSession session = request.getSession(false);
        if (session != null) {
            KhachHang sessionUser = (KhachHang) session.getAttribute("clientUser");
            if (sessionUser != null) {
                // Fetch the latest status from DB
                Optional<KhachHang> khOpt = khachHangRepository.findById(sessionUser.getId());
                if (khOpt.isPresent()) {
                    KhachHang kh = khOpt.get();
                    if (kh.getTrangThai() == null || kh.getTrangThai() != 1) {
                        // User is locked or inactive, invalidate session
                        session.removeAttribute("clientUser");
                        session.invalidate();

                        String uri = request.getRequestURI();
                        // If it's an API call, we can return 401 or a specific response
                        if (uri.startsWith("/api/")) {
                            response.setContentType("application/json;charset=UTF-8");
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.getWriter().write("{\"message\":\"Tài khoản đã hết hạn\", \"expired\": true}");
                            return false; // Stop further execution
                        } else {
                            // If it's a page request, show alert and redirect
                            response.setContentType("text/html;charset=UTF-8");
                            String htmlResponse = "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>Thông báo</title><script src=\"https://cdn.jsdelivr.net/npm/sweetalert2@11\"></script></head>" +
                                    "<body><script>Swal.fire({icon: 'warning', title: 'Thông báo', text: 'Tài khoản đã hết hạn hoặc bị khóa!', confirmButtonText: 'Đăng nhập lại', allowOutsideClick: false})" +
                                    ".then((result) => { if (result.isConfirmed) { window.location.href = '/client/dang-nhap'; } });</script></body></html>";
                            response.getWriter().write(htmlResponse);
                            return false;
                        }
                    }
                } else {
                    // User no longer exists
                    session.removeAttribute("clientUser");
                    session.invalidate();
                    String uri = request.getRequestURI();
                    if (uri.startsWith("/api/")) {
                        response.setContentType("application/json;charset=UTF-8");
                        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                        response.getWriter().write("{\"message\":\"Tài khoản đã hết hạn\", \"expired\": true}");
                        return false;
                    } else {
                        response.setContentType("text/html;charset=UTF-8");
                        String htmlResponse = "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>Thông báo</title><script src=\"https://cdn.jsdelivr.net/npm/sweetalert2@11\"></script></head>" +
                                "<body><script>Swal.fire({icon: 'warning', title: 'Thông báo', text: 'Tài khoản đã hết hạn!', confirmButtonText: 'Đăng nhập lại', allowOutsideClick: false})" +
                                ".then((result) => { if (result.isConfirmed) { window.location.href = '/client/dang-nhap'; } });</script></body></html>";
                        response.getWriter().write(htmlResponse);
                        return false;
                    }
                }
            }
        }
        return true;
    }
}
