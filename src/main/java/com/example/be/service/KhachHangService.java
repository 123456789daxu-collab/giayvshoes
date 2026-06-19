package com.example.be.service;

import com.example.be.entity.KhachHang;
import com.example.be.dto.KhachHangDto;
import org.springframework.data.domain.Page;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;

public interface KhachHangService {
    Page<KhachHang> searchKhachHang(String search, Boolean gioiTinh, LocalDate dob, Integer trangThai, int page, int size);
    
    KhachHang findById(Long id);
    
    KhachHang createKhachHang(KhachHangDto dto);
    
    KhachHang updateKhachHang(Long id, KhachHangDto dto);
    
    KhachHang toggleStatus(Long id, Integer status);
    
    void deleteKhachHang(Long id);
    
    void updateAvatar(Long id, String avatarPath);
    
    List<KhachHang> getFilteredList(String search, Boolean gioiTinh, LocalDate dob, Integer trangThai);
    
    byte[] exportExcel(String search, Boolean gioiTinh, LocalDate dob, Integer trangThai) throws IOException;
    
    void importExcel(MultipartFile file) throws Exception;
    
    byte[] downloadTemplate() throws IOException;
}
