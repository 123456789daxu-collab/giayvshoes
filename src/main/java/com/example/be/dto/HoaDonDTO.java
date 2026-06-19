package com.example.be.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class HoaDonDTO {
    private Long id;
    private String maHoaDon;
    private String nguoiTao;
    private String tenKhachHang;
    private String sdtKhachHang;
    private Integer soLuong;
    private LocalDateTime ngayTao;
    private BigDecimal tongTien;
    private String loaiHoaDon;
    private Integer trangThai;
}
