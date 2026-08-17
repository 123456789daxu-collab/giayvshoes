package com.example.be.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalTime;

@Entity
@Table(name = "ca_lam")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CaLam {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ma_ca", unique = true)
    private String maCa;

    @Column(name = "ten_ca", columnDefinition = "nvarchar(255)")
    private String tenCa;

    @Column(name = "thoi_gian_bat_dau")
    private LocalTime thoiGianBatDau;

    @Column(name = "thoi_gian_ket_thuc")
    private LocalTime thoiGianKetThuc;

    @Column(name = "trang_thai")
    private Integer trangThai; // 1: Hoat dong, 0: Ngung hoat dong
}
