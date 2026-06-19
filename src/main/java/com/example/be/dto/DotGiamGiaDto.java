package com.example.be.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
public class DotGiamGiaDto {
    private Long id;
    private String maDotGiamGia;
    private String tenDotGiamGia;
    private Integer phanTramGiam;
    private LocalDateTime ngayBatDau;
    private LocalDateTime ngayKetThuc;
    private String moTa;
    private Integer trangThai; // 1: Kích hoạt, 0: Ngừng hoạt động
    
    private String hinhThucGiam;
    private java.math.BigDecimal giaTriGiam;

    // Product detail IDs associated with this discount campaign
    private List<Long> productDetailIds;
}
