package com.example.be.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "hinh_thuc_thanh_toan")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HinhThucThanhToan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ma_pttt")
    private String maPttt;

    @Column(name = "ten_pttt")
    private String tenPttt;

    @Column(name = "trang_thai")
    private Integer trangThai;
}
