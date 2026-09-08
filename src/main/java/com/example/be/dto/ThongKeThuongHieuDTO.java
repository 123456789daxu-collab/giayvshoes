package com.example.be.dto;

import lombok.*;
import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ThongKeThuongHieuDTO {
    private Long idThuongHieu;
    private String tenThuongHieu;
    private BigDecimal doanhThu;
    private Long soLuongBan;
}
