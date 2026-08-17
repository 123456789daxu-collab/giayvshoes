package com.example.be.security;

import com.example.be.entity.NhanVien;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;

public class CustomUserDetails implements UserDetails {

    private NhanVien nhanVien;

    public CustomUserDetails(NhanVien nhanVien) {
        this.nhanVien = nhanVien;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        String chucVu = nhanVien.getChucVu() != null ? nhanVien.getChucVu().trim() : "";
        String role = "ROLE_STAFF"; // Default role
        if ("Quản lý".equalsIgnoreCase(chucVu) || "admin".equalsIgnoreCase(chucVu) || "admin".equalsIgnoreCase(nhanVien.getMaNhanVien())) {
            role = "ROLE_ADMIN";
        }
        return Collections.singleton(new SimpleGrantedAuthority(role));
    }

    @Override
    public String getPassword() {
        return nhanVien.getMatKhau();
    }

    @Override
    public String getUsername() {
        // We use MaNhanVien as the username
        return nhanVien.getMaNhanVien();
    }

    public NhanVien getNhanVien() {
        return nhanVien;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        // trang_thai == 1 is Active, 0 is Inactive
        return nhanVien.getTrangThai() != null && nhanVien.getTrangThai() == 1;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return nhanVien.getTrangThai() != null && nhanVien.getTrangThai() == 1;
    }
}
