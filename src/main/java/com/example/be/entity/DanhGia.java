package com.example.be.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "danh_gia")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DanhGia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_hoa_don")
    private HoaDon hoaDon;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_san_pham")
    private SanPham sanPham;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_khach_hang")
    private KhachHang khachHang;

    /** Số sao: 1–5 */
    @Column(name = "so_sao", nullable = false)
    private Integer soSao;

    /** Nội dung đánh giá */
    @Column(name = "noi_dung", columnDefinition = "nvarchar(max)")
    private String noiDung;

    /** Danh sách URL ảnh (JSON array, tối đa 5 ảnh), vd: ["/upload/dg_xxx.jpg", ...] */
    @Column(name = "anh_danh_gia", columnDefinition = "nvarchar(max)")
    private String anhDanhGia;

    /** Tên hiển thị (dùng khi khách vãng lai) */
    @Column(name = "ten_hien_thi", columnDefinition = "nvarchar(255)")
    private String tenHienThi;

    @Column(name = "ngay_tao")
    private LocalDateTime ngayTao;

    /** 1 = hiển thị, 0 = ẩn */
    @Builder.Default
    @Column(name = "trang_thai")
    private Integer trangThai = 1;

    /** Phản hồi từ người bán / admin */
    @Column(name = "phan_hoi", columnDefinition = "nvarchar(max)")
    private String phanHoi;

    /** Thời gian phản hồi */
    @Column(name = "ngay_phan_hoi")
    private LocalDateTime ngayPhanHoi;

    /** Tên người phản hồi (mặc định: Shop VShoes) */
    @Column(name = "nguoi_phan_hoi", columnDefinition = "nvarchar(255)")
    private String nguoiPhanHoi;
}
