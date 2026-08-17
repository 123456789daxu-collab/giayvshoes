package com.example.be.controller;

import com.example.be.dto.ThongKeBieuDoDTO;
import com.example.be.dto.ThongKeTongQuanDTO;
import com.example.be.dto.ThongKeTrangThaiDTO;
import com.example.be.dto.TopSanPhamDTO;
import com.example.be.service.ThongKeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/thong-ke")
public class ThongKeRestController {

    @Autowired
    private ThongKeService thongKeService;

    @GetMapping("/tong-quan")
    public ResponseEntity<ThongKeTongQuanDTO> getThongKeTongQuan(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        return ResponseEntity.ok(thongKeService.getThongKeTongQuan(startDate, endDate));
    }

    @GetMapping("/bieu-do")
    public ResponseEntity<List<ThongKeBieuDoDTO>> getBieuDoDoanhThu(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        return ResponseEntity.ok(thongKeService.getBieuDoDoanhThu(startDate, endDate));
    }

    @GetMapping("/trang-thai")
    public ResponseEntity<List<ThongKeTrangThaiDTO>> getPhanBoTrangThai(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        return ResponseEntity.ok(thongKeService.getPhanBoTrangThai(startDate, endDate));
    }

    @GetMapping("/top-san-pham")
    public ResponseEntity<List<TopSanPhamDTO>> getTopSanPhamBanChay(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(required = false) Long idChatLieu,
            @RequestParam(required = false) Long idThuongHieu,
            @RequestParam(required = false) Long idLoaiGiay,
            @RequestParam(required = false) Long idCoGiay,
            @RequestParam(required = false) Long idMauSac,
            @RequestParam(required = false) Long idDanhMuc,
            @RequestParam(required = false) Integer trangThai) {
        return ResponseEntity.ok(thongKeService.getTopSanPhamBanChay(
                startDate, endDate, idChatLieu, idThuongHieu, idLoaiGiay, idCoGiay, idMauSac, idDanhMuc, trangThai));
    }
}
