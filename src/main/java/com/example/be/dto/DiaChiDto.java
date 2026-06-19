package com.example.be.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiaChiDto {
    private Long id;
    private String tenNguoiNhan;
    private String sdt;
    private String tinhThanh;
    private String quanHuyen;
    private String phuongXa;
    private String diaChiChiTiet;
    private String loaiDiaChi;
    private Boolean macDinh;
}
