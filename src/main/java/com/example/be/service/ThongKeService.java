package com.example.be.service;

import com.example.be.dto.ThongKeBieuDoDTO;
import com.example.be.dto.ThongKeTongQuanDTO;
import com.example.be.dto.ThongKeTrangThaiDTO;
import com.example.be.dto.ThongKeThuongHieuDTO;
import com.example.be.dto.TopSanPhamDTO;

import java.time.LocalDateTime;
import java.util.List;

public interface ThongKeService {
    
    ThongKeTongQuanDTO getThongKeTongQuan(LocalDateTime startDate, LocalDateTime endDate);
    
    List<ThongKeBieuDoDTO> getBieuDoDoanhThu(LocalDateTime startDate, LocalDateTime endDate);
    
    List<ThongKeTrangThaiDTO> getPhanBoTrangThai(LocalDateTime startDate, LocalDateTime endDate);
    
    List<ThongKeThuongHieuDTO> getThongKeThuongHieu(LocalDateTime startDate, LocalDateTime endDate);

    List<TopSanPhamDTO> getTopSanPhamBanChay(LocalDateTime startDate, LocalDateTime endDate,
                                             Long idChatLieu, Long idThuongHieu, Long idLoaiGiay,
                                             Long idCoGiay, Long idMauSac, Long idDanhMuc, Integer trangThai);
}
