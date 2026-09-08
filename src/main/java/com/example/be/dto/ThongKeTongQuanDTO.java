package com.example.be.dto;

import lombok.*;
import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ThongKeTongQuanDTO {
    private BigDecimal tongDoanhThu;
    private Long tongDonHang;
    private BigDecimal tongTienMat;
    private BigDecimal tongTienChuyenKhoan;
    private BigDecimal giaTriTrungBinhDon;
    private Long sanPhamDaBan;
    private Long khachMoi;
    private BigDecimal doanhThuThucTe;
    private BigDecimal doanhThuDuKien;
    
    // Hom nay
    private BigDecimal doanhThuHomNay;
    private Long soDonHomNay;
    private Long soSanPhamHomNay;
    
    // Tuan nay
    private BigDecimal doanhThuTuanNay;
    private Long soDonTuanNay;
    private Long soSanPhamTuanNay;
    
    // Thang nay
    private BigDecimal doanhThuThangNay;
    private Long soDonThangNay;
    private Long soSanPhamThangNay;
    
    // Nam nay
    private BigDecimal doanhThuNamNay;
    private Long soDonNamNay;
    private Long soSanPhamNamNay;
}
