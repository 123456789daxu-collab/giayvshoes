package com.example.be.dto;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
public class SanPhamGiamGiaDto {
    private Long id;
    private String maSanPham;
    private String tenSanPham;
    private List<Long> chiTietIds;
}
