package com.example.be.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
public class PhieuGiamGiaDto {
    private Long id;
    private String maVoucher;
    private String tenVoucher;
    private String loaiGiamGia; // "Tiền mặt" or "Phần trăm"
    private BigDecimal giaTriGiam;
    private BigDecimal donToiThieu;
    private BigDecimal giamToiDa;
    private Integer soLuong;
    private Integer soLuongDaDung;
    private String loaiPhieu; // "Công khai" or "Cá nhân"
    private LocalDateTime ngayBatDau;
    private LocalDateTime ngayKetThuc;
    private Integer trangThai; // 1: Hoạt động, 0: Ngừng hoạt động
    
    // Target customer IDs if type is "Cá nhân"
    private List<Long> customerIds;
}
