package com.example.be.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "san_pham_chi_tiet")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SanPhamChiTiet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_san_pham")
    private SanPham sanPham;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_mau_sac")
    private MauSac mauSac;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_co_giay")
    private CoGiay coGiay;

    @Column(name = "ma")
    private String ma;

    @Column(name = "gia_nhap")
    private BigDecimal giaNhap;

    @Column(name = "gia_ban")
    private BigDecimal giaBan;

    @Column(name = "so_luong_ton")
    private Integer soLuongTon;

    @Column(name = "trang_luong")
    private Double trangLuong;

    @Column(name = "hinh_anh")
    private String hinhAnh;

    @Column(name = "trang_thai")
    private Integer trangThai;

    @Transient
    public java.util.List<String> getDanhSachHinhAnh() {
        if (hinhAnh == null || hinhAnh.trim().isEmpty()) {
            return new java.util.ArrayList<>();
        }
        String trimmed = hinhAnh.trim();
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            // Mảng JSON chuỗi: ["img1", "img2"]
            if (trimmed.length() <= 4) { // Dạng [] hoặc [""]
                return new java.util.ArrayList<>();
            }
            // Cắt bỏ 2 ký tự đầu `["` và 2 ký tự cuối `"]`
            String cleanStr = trimmed.substring(2, trimmed.length() - 2);
            // Cắt chuỗi theo `","`
            String[] parts = cleanStr.split("\",\"");
            return java.util.Arrays.asList(parts);
        }
        return java.util.Arrays.asList(trimmed.split(","));
    }
}
