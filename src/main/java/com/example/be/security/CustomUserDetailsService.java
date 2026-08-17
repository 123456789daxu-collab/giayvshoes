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
        // Find user by ma_nhan_vien or email
        Optional<NhanVien> nhanVienOpt = nhanVienRepository.findByMaNhanVien(username);
        
        if (nhanVienOpt.isEmpty()) {
            // fallback to search by email just in case
            // Wait, we don't have findByEmail in repository. We'll just stick to maNhanVien for now
            // or we could throw exception
            throw new UsernameNotFoundException("Không tìm thấy mã nhân viên: " + username);
        }
        
        return new CustomUserDetails(nhanVienOpt.get());
    }
}
