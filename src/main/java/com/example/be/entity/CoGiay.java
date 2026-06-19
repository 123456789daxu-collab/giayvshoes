package com.example.be.entity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "co_giay")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CoGiay {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ma_co_giay")
    private String maCoGiay;

    @Column(name = "size_giay")
    private Integer sizeGiay;

    @Column(name = "trang_thai")
    private Boolean trangThai;
}
