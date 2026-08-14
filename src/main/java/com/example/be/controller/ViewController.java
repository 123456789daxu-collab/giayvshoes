package com.example.be.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import com.example.be.repository.*;

@Controller
public class ViewController {

    @GetMapping("/")
    public String index() {
        return "redirect:/thong-ke";
    }

    @GetMapping("/dang-nhap")
    public String login() {
        return "login";
    }

    @Autowired
    private ThuongHieuRepository thuongHieuRepository;
    @Autowired
    private ChatLieuRepository chatLieuRepository;
    @Autowired
    private LoaiGiayRepository loaiGiayRepository;
    @Autowired
    private DanhMucRepository danhMucRepository;
    @Autowired
    private MauSacRepository mauSacRepository;
    @Autowired
    private CoGiayRepository coGiayRepository;

    @GetMapping("/thong-ke")
    public String thongKe(Model model) {
        model.addAttribute("listThuongHieu", thuongHieuRepository.findAll());
        model.addAttribute("listChatLieu", chatLieuRepository.findAll());
        model.addAttribute("listLoaiGiay", loaiGiayRepository.findAll());
        model.addAttribute("listDanhMuc", danhMucRepository.findAll());
        model.addAttribute("listMauSac", mauSacRepository.findAll());
        model.addAttribute("listCoGiay", coGiayRepository.findAll());
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

    // @GetMapping("/san-pham")
    // public String sanPham() {
    // return "san-pham";
    // }

    @GetMapping("/san-pham-chi-tiet")
    public String sanPhamChiTiet() {
        return "redirect:/san-pham/chi-tiet-global";
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

    @GetMapping("/hoa-don/{id}")
    public String hoaDonChiTiet(@PathVariable("id") Long id) {
        return "hoa-don-chi-tiet";
    }

    @GetMapping("/ca-lam")
    public String caLam() {
        return "ca-lam";
    }

    @GetMapping("/trang-chu")
    public String trangChu() {
        return "trang-chu";
    }

    @GetMapping("/lich-lam-viec")
    public String lichLamViec() {
        return "lich-lam-viec";
    }

    @GetMapping("/giao-ca")
    public String giaoCa() {
        return "giao-ca";
    }

    @GetMapping("/them-lich-lam-viec")
    public String themLichLamViec() {
        return "them-lich-lam-viec";
    }

    @GetMapping("/client")
    public String clientDefault() {
        return "redirect:/trang-chu";
    }

    @GetMapping("/client/san-pham")
    public String clientSanPham() {
        return "client/san-pham";
    }

    @GetMapping("/client/products/{id}")
    public String clientProductDetail(@PathVariable Long id) {
        return "client/product-detail";
    }

    @GetMapping("/client/cart")
    public String clientCart() {
        return "client/cart";
    }

    @GetMapping("/client/checkout")
    public String clientCheckout() {
        return "client/checkout";
    }

    @GetMapping("/client/checkout/payment-online")
    public String clientPaymentOnline() {
        return "client/payment-online";
    }

    @GetMapping("/client/checkout/success")
    public String clientCheckoutSuccess() {
        return "client/checkout-success";
    }

    @GetMapping("/client/tra-cuu")
    public String clientTraCuu() {
        return "client/tra-cuu";
    }

    @GetMapping("/client/dang-nhap")
    public String clientDangNhap() {
        return "client/dang-nhap";
    }

    @GetMapping("/client/dang-ky")
    public String clientDangKy() {
        return "client/dang-ky";
    }

    @GetMapping("/client/tai-khoan")
    public String clientTaiKhoan() {
        return "client/tai-khoan";
    }

    @GetMapping("/client/tin-tuc")
    public String clientTinTuc() {
        return "client/tin-tuc";
    }

    @GetMapping("/client/gioi-thieu")
    public String clientGioiThieu() {
        return "client/gioi-thieu";
    }

    @GetMapping("/client/lien-he")
    public String clientLienHe() {
        return "client/lien-he";
    }

    @GetMapping("/client/flash-sale")
    public String clientFlashSale() {
        return "client/flash-sale";
    }

    @GetMapping("/flash-sale")
    public String flashSaleShortcut() {
        return "redirect:/client/flash-sale";
    }
}
