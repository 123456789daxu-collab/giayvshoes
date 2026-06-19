package com.example.be.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class ViewController {

    @GetMapping("/")
    public String index() {
        return "redirect:/trang-chu";
    }

    @GetMapping("/trang-chu")
    public String trangChu() {
        return "trang-chu";
    }

    @GetMapping("/thong-ke")
    public String thongKe() {
        return "thong-ke";
    }

    @GetMapping("/ban-hang")
    public String banHang() {
        return "ban-hang";
    }

    @GetMapping("/hoa-don")
    public String hoaDon() {
        return "hoa-don";
    }



    @GetMapping("/phieu-giam-gia")
    public String phieuGiamGia() {
        return "phieu-giam-gia";
    }

    @GetMapping("/dot-giam-gia")
    public String dotGiamGia() {
        return "dot-giam-gia";
    }

    @GetMapping("/tai-khoan/khach-hang")
    public String taiKhoanKhachHang() {
        return "tai-khoan-khach-hang";
    }

    @GetMapping("/tai-khoan/nhan-vien")
    public String taiKhoanNhanVien() {
        return "tai-khoan-nhan-vien";
    }
}
