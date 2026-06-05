package com.example.be.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@Builder
public class KhachHangVoucherDto {
    private Long id;
    private String maKhachHang;
    private String hoTen;
    private String soDienThoai;
    private String email;
    private LocalDate ngaySinh;
    private LocalDateTime ngayDatGanNhat; // Last order date
    private Long soLanDat; // Number of orders placed
    private BigDecimal tongTienDaDat; // Total payment amount

    public KhachHangVoucherDto(Long id, String maKhachHang, String hoTen, String soDienThoai, String email, 
                               LocalDate ngaySinh, LocalDateTime ngayDatGanNhat, Long soLanDat, BigDecimal tongTienDaDat) {
        this.id = id;
        this.maKhachHang = maKhachHang;
        this.hoTen = hoTen;
        this.soDienThoai = soDienThoai;
        this.email = email;
        this.ngaySinh = ngaySinh;
        this.ngayDatGanNhat = ngayDatGanNhat;
        this.soLanDat = soLanDat != null ? soLanDat : 0L;
        this.tongTienDaDat = tongTienDaDat != null ? tongTienDaDat : BigDecimal.ZERO;
    }
}

