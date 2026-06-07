package com.example.be.service;

import com.example.be.entity.ChiTietHoaDon;
import com.example.be.entity.HoaDon;

import java.math.BigDecimal;
import java.util.List;

public interface BanHangService {
    
    // 1. Quản lý hóa đơn chờ
    List<HoaDon> getDanhSachHoaDonCho();
    HoaDon taoHoaDonCho();
    void huyHoaDonCho(Long idHoaDon);
    
    // 2. Quản lý chi tiết hóa đơn
    List<ChiTietHoaDon> getChiTietHoaDon(Long idHoaDon);
    ChiTietHoaDon themSanPhamVaoHoaDon(Long idHoaDon, Long idSanPhamChiTiet, Integer soLuong);
    ChiTietHoaDon capNhatSoLuong(Long idChiTiet, Integer soLuong);
    void xoaChiTiet(Long idChiTiet);
    
    // 3. Khách hàng & Phiếu giảm giá
    HoaDon capNhatKhachHang(Long idHoaDon, Long idKhachHang);
    HoaDon capNhatPhieuGiamGia(Long idHoaDon, Long idPhieuGiamGia);
    
    // 4. Thanh toán
    HoaDon thanhToan(Long idHoaDon, BigDecimal tongTienHang, BigDecimal tienGiamGia, BigDecimal tongTienThanhToan, String ghiChu);
}
