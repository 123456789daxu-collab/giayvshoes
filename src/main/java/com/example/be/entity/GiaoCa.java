package com.example.be.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "giao_ca")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GiaoCa {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ma_giao_ca", unique = true)
    private String maGiaoCa;

    @Column(name = "thoi_gian_nhan_ca")
    private LocalDateTime thoiGianNhanCa;

    @Column(name = "thoi_gian_giao_ca")
    private LocalDateTime thoiGianGiaoCa;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "nhan_vien_giao_id")
    private NhanVien nhanVienGiao;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "nhan_vien_nhan_id")
    private NhanVien nhanVienNhan;

    @Column(name = "tien_ban_giao", precision = 18, scale = 2)
    private BigDecimal tienBanGiao;

    @Column(name = "tien_phat_sinh", precision = 18, scale = 2)
    private BigDecimal tienPhatSinh;

    @Column(name = "ghi_chu", columnDefinition = "nvarchar(500)")
    private String ghiChu;

    @Column(name = "trang_thai")
    private Integer trangThai; // 0: Dang trong ca, 1: Da giao ca
}
