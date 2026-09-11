package com.example.be.service;

import com.example.be.dto.HoaDonDTO;
import com.example.be.entity.KhachHang;

import java.util.List;
import java.util.Map;

public interface AuthService {
    KhachHang updateProfile(Long userId, Map<String, String> payload);
    void changePassword(Long userId, String oldPassword, String newPassword);
    List<HoaDonDTO> getMyOrders(Long userId, String soDienThoai);
    KhachHang register(Map<String, String> payload);
    KhachHang login(String emailOrPhone, String matKhau);
    Map<String, Object> getCurrentUserInfo(KhachHang kh);
}
