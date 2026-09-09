package com.example.be.security;

import com.example.be.entity.NhanVien;
import com.example.be.repository.NhanVienRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private NhanVienRepository nhanVienRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        if (username == null || username.trim().isEmpty()) {
            throw new UsernameNotFoundException("Tên đăng nhập không được để trống!");
        }
        String cleanUsername = username.trim();

        // 1. Tìm theo mã nhân viên
        Optional<NhanVien> nhanVienOpt = nhanVienRepository.findByMaNhanVien(cleanUsername);
        
        // 2. Nếu không thấy, tìm theo email
        if (nhanVienOpt.isEmpty()) {
            nhanVienOpt = nhanVienRepository.findByEmail(cleanUsername);
        }

        // 3. Nếu vẫn không thấy, tìm theo số điện thoại
        if (nhanVienOpt.isEmpty()) {
            nhanVienOpt = nhanVienRepository.findBySoDienThoai(cleanUsername);
        }
        
        if (nhanVienOpt.isEmpty()) {
            throw new UsernameNotFoundException("Không tìm thấy tài khoản nhân viên: " + cleanUsername);
        }
        
        return new CustomUserDetails(nhanVienOpt.get());
    }
}
