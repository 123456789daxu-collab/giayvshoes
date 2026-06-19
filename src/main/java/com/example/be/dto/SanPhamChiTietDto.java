package com.example.be.dto;

import lombok.*;
import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SanPhamChiTietDto {
    private Long id;
    private String ma;
    private String tenSanPham;
    private String tenMauSac;
    private Integer sizeGiay;
    private BigDecimal giaBan;
    private Integer soLuongTon;
    private Integer trangThai;
}
