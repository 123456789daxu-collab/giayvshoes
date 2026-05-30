package com.example.be.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "lich_su_thanh_toan")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LichSuThanhToan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_hoa_don")
    private HoaDon hoaDon;

    @Column(name = "so_tien")
    private BigDecimal soTien;

    @Column(name = "phuong_thuc_thanh_toan")
    private String phuongThucThanhToan;

    @Column(name = "trang_thai_thanh_toan")
    private Integer trangThaiThanhToan;

    @Column(name = "ngay_thanh_toan")
    private LocalDateTime ngayThanhToan;

    @Column(name = "ghi_chu")
    private String ghiChu;
}
