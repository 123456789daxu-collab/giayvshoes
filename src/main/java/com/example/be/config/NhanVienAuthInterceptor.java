package com.example.be.config;

import com.example.be.entity.NhanVien;
import com.example.be.repository.NhanVienRepository;
import com.example.be.security.CustomUserDetails;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Optional;

@Component
public class NhanVienAuthInterceptor implements HandlerInterceptor {

    @Autowired
    private NhanVienRepository nhanVienRepository;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails) {
            CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();
            Long id = userDetails.getNhanVien().getId();
            
            if (id != null) {
                Optional<NhanVien> nvOpt = nhanVienRepository.findById(id);
                if (nvOpt.isPresent()) {
                    NhanVien nv = nvOpt.get();
                    if (nv.getTrangThai() == null || nv.getTrangThai() != 1) {
                        // User is inactive or locked
                        if (request.getSession(false) != null) {
                            request.getSession().invalidate();
                        }
                        SecurityContextHolder.clearContext();

                        String uri = request.getRequestURI();
                        if (uri.startsWith("/api/")) {
                            response.setContentType("application/json;charset=UTF-8");
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.getWriter().write("{\"message\":\"Tài khoản nhân viên đã bị khóa\", \"expired\": true}");
                            return false;
                        } else {
                            response.setContentType("text/html;charset=UTF-8");
                            String htmlResponse = "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>Thông báo</title><script src=\"https://cdn.jsdelivr.net/npm/sweetalert2@11\"></script></head>" +
                                    "<body><script>Swal.fire({icon: 'warning', title: 'Thông báo', text: 'Tài khoản của bạn đã bị khóa hoặc hết hạn!', confirmButtonText: 'Đăng nhập lại', allowOutsideClick: false})" +
                                    ".then((result) => { if (result.isConfirmed) { window.location.href = '/dang-nhap'; } });</script></body></html>";
                            response.getWriter().write(htmlResponse);
                            return false;
                        }
                    }
                } else {
                     // User not found in DB anymore
                     if (request.getSession(false) != null) {
                        request.getSession().invalidate();
                     }
                     SecurityContextHolder.clearContext();
                     
                     String uri = request.getRequestURI();
                     if (uri.startsWith("/api/")) {
                         response.setContentType("application/json;charset=UTF-8");
                         response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                         response.getWriter().write("{\"message\":\"Tài khoản không tồn tại\", \"expired\": true}");
                         return false;
                     } else {
                         response.setContentType("text/html;charset=UTF-8");
                         String htmlResponse = "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>Thông báo</title><script src=\"https://cdn.jsdelivr.net/npm/sweetalert2@11\"></script></head>" +
                                 "<body><script>Swal.fire({icon: 'warning', title: 'Thông báo', text: 'Tài khoản của bạn không còn tồn tại!', confirmButtonText: 'Đăng nhập lại', allowOutsideClick: false})" +
                                 ".then((result) => { if (result.isConfirmed) { window.location.href = '/dang-nhap'; } });</script></body></html>";
                         response.getWriter().write(htmlResponse);
                         return false;
                     }
                }
            }
        }
        return true;
    }
}
