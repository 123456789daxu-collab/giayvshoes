package com.example.be.entity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "danh_muc")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DanhMuc {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ma_danh_muc")
    private String maDanhMuc;

    @Column(name = "ten_danh_muc")
    private String tenDanhMuc;

    @Column(name = "trang_thai")
    private Boolean trangThai;
}
