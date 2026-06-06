package com.example.be.entity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "loai_giay")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoaiGiay {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ma_loai_giay")
    private String maLoaiGiay;

    @Column(name = "ten_loai_giay")
    private String tenLoaiGiay;

    @Column(name = "trang_thai")
    private Boolean trangThai;
}
