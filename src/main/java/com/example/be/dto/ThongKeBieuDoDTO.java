package com.example.be.dto;

import lombok.*;
import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ThongKeBieuDoDTO {
    private String ngay; // Format YYYY-MM-DD
    private BigDecimal doanhThu;
}
