package com.example.be;

import com.example.be.entity.PhieuGiamGia;
import com.example.be.entity.PhieuGiamGiaKhachHang;
import com.example.be.entity.KhachHang;
import com.example.be.repository.PhieuGiamGiaRepository;
import com.example.be.repository.PhieuGiamGiaKhachHangRepository;
import com.example.be.repository.KhachHangRepository;
import com.example.be.entity.NhanVien;
import com.example.be.repository.NhanVienRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@SpringBootApplication
public class BeApplication {

    public static void main(String[] args) {
        SpringApplication.run(BeApplication.class, args);
    }

    @Bean
    public CommandLineRunner initVoucherData(
            PhieuGiamGiaRepository phieuGiamGiaRepository,
            PhieuGiamGiaKhachHangRepository phieuGiamGiaKhachHangRepository,
            KhachHangRepository khachHangRepository) {
        return args -> {
            if (phieuGiamGiaRepository.count() == 0) {
                System.out.println("--- Dữ liệu trống. Đang nạp các phiếu giảm giá mặc định... ---");

                // 1. Voucher 1: PGG001 (Phần trăm, Công khai)
                PhieuGiamGia pgg001 = PhieuGiamGia.builder()
                        .maVoucher("PGG001")
                        .tenVoucher("pgg")
                        .loaiGiamGia("Phần trăm")
                        .giaTriGiam(BigDecimal.valueOf(100))
                        .donToiThieu(BigDecimal.valueOf(10000))
                        .giamToiDa(BigDecimal.valueOf(50))
                        .soLuong(6)
                        .soLuongDaDung(0)
                        .loaiPhieu("Công khai")
                        .ngayBatDau(LocalDateTime.now().minusHours(1))
                        .ngayKetThuc(LocalDateTime.now().plusDays(2))
                        .ngayTao(LocalDateTime.now())
                        .trangThai(1)
                        .build();

                // 2. Voucher 2: PGG002 (Tiền mặt, Cá nhân)
                PhieuGiamGia pgg002 = PhieuGiamGia.builder()
                        .maVoucher("PGG002")
                        .tenVoucher("pgg1")
                        .loaiGiamGia("Tiền mặt")
                        .giaTriGiam(BigDecimal.valueOf(1000000))
                        .donToiThieu(BigDecimal.valueOf(200000000))
                        .giamToiDa(BigDecimal.valueOf(0))
                        .soLuong(0) // Sẽ tự cập nhật nếu map khách hàng
                        .soLuongDaDung(0)
                        .loaiPhieu("Cá nhân")
                        .ngayBatDau(LocalDateTime.now().minusHours(1))
                        .ngayKetThuc(LocalDateTime.now().plusDays(2))
                        .ngayTao(LocalDateTime.now())
                        .trangThai(1)
                        .build();

                // 3. Voucher 3: VC_HOANTHANH
                PhieuGiamGia vcHoanhAnh = PhieuGiamGia.builder()
                        .maVoucher("VC_HOANTHANH")
                        .tenVoucher("Mã Giảm Giá Tri Ân Hoàn Anh")
                        .loaiGiamGia("Tiền mặt")
                        .giaTriGiam(BigDecimal.valueOf(50000))
                        .donToiThieu(BigDecimal.valueOf(200000))
                        .giamToiDa(BigDecimal.valueOf(50000))
                        .soLuong(100)
                        .soLuongDaDung(0)
                        .loaiPhieu("Công khai")
                        .ngayBatDau(LocalDateTime.now().minusDays(3))
                        .ngayKetThuc(LocalDateTime.now().plusDays(30))
                        .ngayTao(LocalDateTime.now())
                        .trangThai(1)
                        .build();

                phieuGiamGiaRepository.save(pgg001);
                PhieuGiamGia savedPgg002 = phieuGiamGiaRepository.save(pgg002);
                phieuGiamGiaRepository.save(vcHoanhAnh);

                // Gán voucher PGG002 cho khách hàng đầu tiên trong DB (nếu có)
                List<KhachHang> customers = khachHangRepository.findAll();
                if (!customers.isEmpty()) {
                    KhachHang firstCustomer = customers.get(0);
                    PhieuGiamGiaKhachHang mapping = PhieuGiamGiaKhachHang.builder()
                            .phieuGiamGia(savedPgg002)
                            .khachHang(firstCustomer)
                            .trangThai(1)
                            .build();
                    phieuGiamGiaKhachHangRepository.save(mapping);

                    // Cập nhật số lượng của PGG002
                    savedPgg002.setSoLuong(1);
                    phieuGiamGiaRepository.save(savedPgg002);
                }

                System.out.println("--- Đã nạp thành công 3 phiếu giảm giá mặc định! ---");
            }
        };
    }

    @Bean
    public CommandLineRunner initUserData(
            NhanVienRepository nhanVienRepository,
            com.example.be.repository.HoaDonRepository hoaDonRepository,
            com.example.be.repository.LichLamViecRepository lichLamViecRepository,
            com.example.be.repository.GiaoCaRepository giaoCaRepository) {
        return args -> {
            // Xóa nhân viên theo yêu cầu: Lê Hải Anh (123456789daxu@gmail.com / 0349678371)
            List<NhanVien> allEmployees = nhanVienRepository.findAll();
            for (NhanVien nv : allEmployees) {
                boolean isTarget = "123456789daxu@gmail.com".equalsIgnoreCase(nv.getEmail())
                        || "0349678371".equals(nv.getSoDienThoai())
                        || "Lê Hải Anh".equalsIgnoreCase(nv.getHoTen());
                if (isTarget) {
                    Long nvId = nv.getId();
                    // Gỡ ràng buộc trong HoaDon
                    List<com.example.be.entity.HoaDon> hoaDons = hoaDonRepository.findAll();
                    for (com.example.be.entity.HoaDon hd : hoaDons) {
                        if (hd.getNhanVien() != null && hd.getNhanVien().getId().equals(nvId)) {
                            hd.setNhanVien(null);
                            hoaDonRepository.save(hd);
                        }
                    }
                    // Xóa các bản ghi LichLamViec
                    List<com.example.be.entity.LichLamViec> lichs = lichLamViecRepository.findAll();
                    for (com.example.be.entity.LichLamViec llv : lichs) {
                        if (llv.getNhanVien() != null && llv.getNhanVien().getId().equals(nvId)) {
                            lichLamViecRepository.delete(llv);
                        }
                    }
                    // Xóa hoặc gỡ ràng buộc trong GiaoCa
                    List<com.example.be.entity.GiaoCa> giaoCas = giaoCaRepository.findAll();
                    for (com.example.be.entity.GiaoCa gc : giaoCas) {
                        boolean modified = false;
                        if (gc.getNhanVienGiao() != null && gc.getNhanVienGiao().getId().equals(nvId)) {
                            gc.setNhanVienGiao(null);
                            modified = true;
                        }
                        if (gc.getNhanVienNhan() != null && gc.getNhanVienNhan().getId().equals(nvId)) {
                            gc.setNhanVienNhan(null);
                            modified = true;
                        }
                        if (modified) {
                            if (gc.getNhanVienGiao() == null && gc.getNhanVienNhan() == null) {
                                giaoCaRepository.delete(gc);
                            } else {
                                giaoCaRepository.save(gc);
                            }
                        }
                    }
                    // Xóa nhân viên
                    nhanVienRepository.delete(nv);
                    System.out.println("--- Đã xóa vĩnh viễn nhân viên: " + nv.getHoTen() + " (" + nv.getEmail() + ") ---");
                }
            }

            // Admin Account
            if (nhanVienRepository.findByMaNhanVien("admin").isEmpty()) {
                NhanVien admin = NhanVien.builder()
                        .maNhanVien("admin")
                        .hoTen("Quản trị viên")
                        .email("admin@vshoes.com")
                        .soDienThoai("0987654321")
                        .matKhau("admin")
                        .chucVu("Quản lý")
                        .trangThai(1)
                        .ngaySinh(LocalDate.of(1990, 1, 1))
                        .gioiTinh(true)
                        .build();
                nhanVienRepository.save(admin);
                System.out.println("--- Đã tạo tài khoản Quản lý: admin / admin ---");
            }

            // Staff Account
            Optional<NhanVien> optStaff = nhanVienRepository.findByMaNhanVien("NVTEST");
            if (optStaff.isEmpty()) {
                NhanVien staff = NhanVien.builder()
                        .maNhanVien("NVTEST")
                        .hoTen("Nhân viên test")
                        .email("nvtest@vshoes.com")
                        .soDienThoai("0123456789")
                        .matKhau("123456")
                        .chucVu("Nhân viên")
                        .trangThai(1)
                        .ngaySinh(LocalDate.of(2000, 1, 1))
                        .gioiTinh(true)
                        .build();
                nhanVienRepository.save(staff);
                System.out.println("--- Đã tạo tài khoản Nhân viên: NVTEST / 123456 ---");
            } else {
                NhanVien staff = optStaff.get();
                if ("Nhân viên thử nghiệm".equals(staff.getHoTen())) {
                    staff.setHoTen("Nhân viên test");
                    nhanVienRepository.save(staff);
                    System.out.println("--- Đã cập nhật tên Nhân viên thành: Nhân viên test ---");
                }
            }

            // Tự động xử lý và đổi mã cho các nhân viên đang bị trùng lặp mã
            List<NhanVien> allStaff = nhanVienRepository.findAll();
            java.util.Set<String> seenCodes = new java.util.HashSet<>();
            String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            java.security.SecureRandom random = new java.security.SecureRandom();

            for (NhanVien nv : allStaff) {
                String ma = nv.getMaNhanVien();
                if (ma == null || ma.trim().isEmpty() || seenCodes.contains(ma.trim().toUpperCase())) {
                    String newCode;
                    do {
                        StringBuilder sb = new StringBuilder("NV");
                        for (int i = 0; i < 6; i++) {
                            sb.append(chars.charAt(random.nextInt(chars.length())));
                        }
                        newCode = sb.toString();
                    } while (seenCodes.contains(newCode) || nhanVienRepository.existsByMaNhanVien(newCode));

                    nv.setMaNhanVien(newCode);
                    nhanVienRepository.save(nv);
                    seenCodes.add(newCode.toUpperCase());
                    System.out.println("--- Đã xử lý mã nhân viên bị trùng: ID " + nv.getId() + " -> " + newCode + " ---");
                } else {
                    seenCodes.add(ma.trim().toUpperCase());
                }
            }
        };
    }
}
