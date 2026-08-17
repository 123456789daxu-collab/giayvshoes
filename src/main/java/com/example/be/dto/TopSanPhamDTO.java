package com.example.be.dto;

import lombok.*;
import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TopSanPhamDTO {
    private String maSanPham;
    private String tenSanPham;
    private String thuocTinh;
    private BigDecimal donGia;
    private Integer tonKho;
    private Long daBan;
}
