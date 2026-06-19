package com.example.be.dto;

import lombok.*;
import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
public class SanPhamChiTietGiamGiaDto {
    private Long id;
    private String maSanPham;
    private String tenSanPham;
    private String tenMauSac;
    private String tenKichCo;
    private BigDecimal giaBan;
}
