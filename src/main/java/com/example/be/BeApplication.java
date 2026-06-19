package com.example.be;

import com.example.be.entity.PhieuGiamGia;
import com.example.be.entity.PhieuGiamGiaKhachHang;
import com.example.be.entity.KhachHang;
import com.example.be.repository.PhieuGiamGiaRepository;
import com.example.be.repository.PhieuGiamGiaKhachHangRepository;
import com.example.be.repository.KhachHangRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

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
}
