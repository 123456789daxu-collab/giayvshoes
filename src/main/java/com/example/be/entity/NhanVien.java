package com.example.be.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "nhan_vien")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NhanVien {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ma_nhan_vien")
    private String maNhanVien;

    @Column(name = "ho_ten", columnDefinition = "nvarchar(255)")
    private String hoTen;

    @Column(name = "email", columnDefinition = "nvarchar(255)")
    private String email;

    @Column(name = "so_dien_thoai")
    private String soDienThoai;

    @Column(name = "mat_khau")
    private String matKhau;

    @Column(name = "ngay_sinh")
    private LocalDate ngaySinh;

    @Column(name = "gioi_tinh")
    private Boolean gioiTinh;

    @Column(name = "dia_chi", columnDefinition = "nvarchar(255)")
    private String diaChi;

    @Column(name = "chuc_vu", columnDefinition = "nvarchar(255)")
    private String chucVu;

    @Column(name = "cccd", columnDefinition = "nvarchar(20)")
    private String cccd;

    @Column(name = "anh_dai_dien", columnDefinition = "nvarchar(max)")
    private String anhDaiDien;

    @Column(name = "trang_thai")
    private Integer trangThai;
}
