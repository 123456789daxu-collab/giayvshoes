package com.example.be.service;

import com.example.be.entity.ChiTietHoaDon;
import com.example.be.entity.HoaDon;

import java.math.BigDecimal;
import java.util.List;

public interface BanHangService {
    List<HoaDon> getDanhSachHoaDonCho();
    HoaDon taoHoaDonCho();
    void huyHoaDonCho(Long id);
    
    List<ChiTietHoaDon> getChiTietHoaDon(Long idHoaDon);
    ChiTietHoaDon themSanPhamVaoHoaDon(Long idHoaDon, Long idSanPhamChiTiet, Integer soLuong);
    ChiTietHoaDon capNhatSoLuong(Long idChiTiet, Integer soLuong);
    void xoaChiTiet(Long idChiTiet);
    
    HoaDon capNhatKhachHang(Long idHoaDon, Long idKhachHang);
    HoaDon capNhatPhieuGiamGia(Long idHoaDon, Long idPhieuGiamGia);
    
    HoaDon thanhToan(Long idHoaDon, String hinhThucThanhToan, BigDecimal tienKhachDua, String ghiChu, String tenKhachHang);
}
