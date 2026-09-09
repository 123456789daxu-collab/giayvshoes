package com.example.be.service;

import com.example.be.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;

/**
 * Service dùng chung quản lý việc tự động sinh Mã cho tất cả các phân hệ / màn quản lý:
 * - Sản phẩm (SP...)
 * - Nhân viên (NV...)
 * - Khách hàng (KH...)
 * - Đợt giảm giá (DGG...)
 * - Phiếu giảm giá / Voucher (PGG...)
 * - Ca làm việc (CA...)
 * - Thương hiệu (TH...)
 * - Danh mục (DM...)
 * - Loại giày (LG...)
 * - Chất liệu (CL...)
 * - Màu sắc (MS...)
 * - Cổ giày / Kích thước (CG...)
 * - Hóa đơn (HD...)
 * - Giao ca (GC...)
 */
@Service
public class MaGeneratorService {

    private static final String RANDOM_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    @Autowired
    private SanPhamRepository sanPhamRepository;

    @Autowired
    private NhanVienRepository nhanVienRepository;

    @Autowired
    private KhachHangRepository khachHangRepository;

    @Autowired
    private DotGiamGiaRepository dotGiamGiaRepository;

    @Autowired
    private PhieuGiamGiaRepository phieuGiamGiaRepository;

    @Autowired
    private CaLamRepository caLamRepository;

    @Autowired
    private ThuongHieuRepository thuongHieuRepository;

    @Autowired
    private DanhMucRepository danhMucRepository;

    @Autowired
    private LoaiGiayRepository loaiGiayRepository;

    @Autowired
    private ChatLieuRepository chatLieuRepository;

    @Autowired
    private MauSacRepository mauSacRepository;

    @Autowired
    private CoGiayRepository coGiayRepository;

    @Autowired
    private HoaDonRepository hoaDonRepository;

    private String generateRandomCode(String prefix, int length) {
        StringBuilder sb = new StringBuilder(prefix);
        for (int i = 0; i < length; i++) {
            sb.append(RANDOM_CHARS.charAt(RANDOM.nextInt(RANDOM_CHARS.length())));
        }
        return sb.toString();
    }

    public String generateMaSanPham() {
        String code;
        do {
            code = generateRandomCode("SP", 6);
        } while (sanPhamRepository.existsByMaSanPham(code));
        return code;
    }

    public String generateMaNhanVien() {
        String code;
        do {
            code = generateRandomCode("NV", 6);
        } while (nhanVienRepository.existsByMaNhanVien(code));
        return code;
    }

    public String generateMaKhachHang() {
        String code;
        do {
            code = generateRandomCode("KH", 6);
        } while (khachHangRepository.findByMaKhachHang(code).isPresent());
        return code;
    }

    public String generateMaDotGiamGia() {
        String code;
        do {
            code = generateRandomCode("DGG", 6);
        } while (dotGiamGiaRepository.existsByMaDotGiamGia(code));
        return code;
    }

    public String generateMaPhieuGiamGia() {
        String code;
        do {
            code = generateRandomCode("PGG", 6);
        } while (phieuGiamGiaRepository.existsByMaVoucher(code));
        return code;
    }

    public String generateMaCaLam() {
        String code;
        do {
            code = generateRandomCode("CA", 6);
        } while (caLamRepository.existsByMaCa(code));
        return code;
    }

    public String generateMaThuongHieu() {
        String code;
        do {
            code = generateRandomCode("TH", 6);
        } while (thuongHieuRepository.existsByMaThuongHieu(code));
        return code;
    }

    public String generateMaDanhMuc() {
        String code;
        do {
            code = generateRandomCode("DM", 6);
        } while (danhMucRepository.existsByMaDanhMuc(code));
        return code;
    }

    public String generateMaLoaiGiay() {
        String code;
        do {
            code = generateRandomCode("LG", 6);
        } while (loaiGiayRepository.existsByMaLoaiGiay(code));
        return code;
    }

    public String generateMaChatLieu() {
        String code;
        do {
            code = generateRandomCode("CL", 6);
        } while (chatLieuRepository.existsByMaChatLieu(code));
        return code;
    }

    public String generateMaMauSac() {
        String code;
        do {
            code = generateRandomCode("MS", 6);
        } while (mauSacRepository.existsByMaMauSac(code));
        return code;
    }

    public String generateMaCoGiay() {
        String code;
        do {
            code = generateRandomCode("CG", 6);
        } while (coGiayRepository.existsByMaCoGiay(code));
        return code;
    }

    public String generateMaHoaDon() {
        String code;
        do {
            code = generateRandomCode("HD", 6);
        } while (hoaDonRepository.existsByMaHoaDon(code));
        return code;
    }

    /**
     * Hàm sinh mã linh hoạt theo loại màn quản lý (type)
     */
    public String generateCodeByType(String type) {
        if (type == null) return generateRandomCode("GEN", 6);
        String t = type.trim().toLowerCase();
        switch (t) {
            case "san-pham":
            case "sanpham":
            case "product":
                return generateMaSanPham();
            case "nhan-vien":
            case "nhanvien":
            case "employee":
                return generateMaNhanVien();
            case "khach-hang":
            case "khachhang":
            case "customer":
                return generateMaKhachHang();
            case "dot-giam-gia":
            case "dotgiamgia":
            case "campaign":
                return generateMaDotGiamGia();
            case "phieu-giam-gia":
            case "phieugiamgia":
            case "voucher":
                return generateMaPhieuGiamGia();
            case "ca-lam":
            case "calam":
            case "shift":
                return generateMaCaLam();
            case "thuong-hieu":
            case "thuonghieu":
            case "brand":
                return generateMaThuongHieu();
            case "danh-muc":
            case "danhmuc":
            case "the-loai":
            case "theloai":
            case "category":
                return generateMaDanhMuc();
            case "loai-giay":
            case "loaigiay":
            case "de-giay":
            case "degiai":
                return generateMaLoaiGiay();
            case "chat-lieu":
            case "chatlieu":
            case "material":
                return generateMaChatLieu();
            case "mau-sac":
            case "mausac":
            case "color":
                return generateMaMauSac();
            case "co-giay":
            case "cogiai":
            case "kich-thuoc":
            case "kichthuoc":
            case "size":
                return generateMaCoGiay();
            case "hoa-don":
            case "hoadon":
            case "invoice":
            case "ban-hang":
                return generateMaHoaDon();
            default:
                return generateRandomCode("CODE", 6);
        }
    }
}
