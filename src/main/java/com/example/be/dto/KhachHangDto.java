package com.example.be.dto;

import lombok.*;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KhachHangDto {
    private Long id;
    private String maKhachHang;
    private String hoTen;
    private String email;
    private String soDienThoai;
    private LocalDate ngaySinh;
    private Boolean gioiTinh; // true: Nam, false: Nữ
    private Integer trangThai; // 1: Hoạt động, 0: Ngừng hoạt động
    private String anhDaiDien;
    
    // Địa chỉ mặc định đính kèm khi khởi tạo khách hàng mới
    private DiaChiDto diaChiMacDinh;
}
