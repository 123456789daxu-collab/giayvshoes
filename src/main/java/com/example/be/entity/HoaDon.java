package com.example.be.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "hoa_don")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HoaDon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_khach_hang")
    private KhachHang khachHang;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_nhan_vien")
    private NhanVien nhanVien;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_phieu_giam_gia")
    private PhieuGiamGia phieuGiamGia;

    @Column(name = "ma_hoa_don")
    private String maHoaDon;

    @Column(name = "loai_hoa_don")
    private String loaiHoaDon;

    @Column(name = "ten_nguoi_nhan")
    private String tenNguoiNhan;

    @Column(name = "sdt_nguoi_nhan")
    private String sdtNguoiNhan;

    @Column(name = "dia_chi_nhan")
    private String diaChiNhan; // dia_chi_nhan in DB

    @Column(name = "ghi_chu")
    private String ghiChu;

    @Transient
    private BigDecimal tongTienHang; // not in DB

    @Column(name = "tien_giam")
    private BigDecimal tienGiam; // tien_giam in DB

    @Column(name = "phi_ship")
    @Builder.Default
    private BigDecimal phiShip = BigDecimal.valueOf(30000); // phi_ship in DB

    @Column(name = "tong_tien")
    private BigDecimal tongTien; // tong_tien in DB

    @Column(name = "ngay_tao")
    private LocalDateTime ngayTao;

    @Transient
    private String nguoiTao; // not in DB

    @Column(name = "ngay_thanh_toan")
    private LocalDateTime ngayThanhToan; // ngay_thanh_toan in DB

    @Transient
    private String nguoiCapNhat; // not in DB

    @Column(name = "trang_thai")
    private Integer trangThai;

    @Transient
    private String lyDoHuy; // not in DB

    // Compatibility getters & setters for Jackson serialization / REST API

    public void setTongTienThanhToan(BigDecimal val) {
        this.tongTien = val;
    }

    public BigDecimal getTongTienThanhToan() {
        return this.tongTien;
    }

    public void setTienGiamGia(BigDecimal val) {
        this.tienGiam = val;
    }

    public BigDecimal getTienGiamGia() {
        return this.tienGiam;
    }

    public void setTienVanChuyen(BigDecimal val) {
        this.phiShip = val;
    }

    public BigDecimal getTienVanChuyen() {
        return this.phiShip;
    }

    public void setDiaChiGiao(String val) {
        this.diaChiNhan = val;
    }

    public String getDiaChiGiao() {
        return this.diaChiNhan;
    }

    public void setNgayCapNhat(LocalDateTime val) {
        this.ngayThanhToan = val;
    }

    public LocalDateTime getNgayCapNhat() {
        return this.ngayThanhToan;
    }


}

