package com.example.be.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "khach_hang")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KhachHang {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ma_khach_hang")
    private String maKhachHang;

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

    @Column(name = "ngay_tao")
    private LocalDateTime ngayTao;

    @Column(name = "anh_dai_dien", columnDefinition = "nvarchar(max)")
    private String anhDaiDien;

    @Column(name = "trang_thai")
    private Integer trangThai;
}
