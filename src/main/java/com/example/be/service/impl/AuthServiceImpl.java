package com.example.be.service.impl;

import com.example.be.dto.HoaDonDTO;
import com.example.be.entity.DiaChi;
import com.example.be.entity.HoaDon;
import com.example.be.entity.KhachHang;
import com.example.be.repository.DiaChiRepository;
import com.example.be.repository.HoaDonRepository;
import com.example.be.repository.KhachHangRepository;
import com.example.be.service.AuthService;
import com.example.be.service.HoaDonService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AuthServiceImpl implements AuthService {

    @Autowired
    private KhachHangRepository khachHangRepository;

    @Autowired
    private DiaChiRepository diaChiRepository;

    @Autowired
    private HoaDonRepository hoaDonRepository;

    @Autowired
    private HoaDonService hoaDonService;

    @Override
    @Transactional
    public KhachHang updateProfile(Long userId, Map<String, String> payload) {
        KhachHang kh = khachHangRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông tin khách hàng!"));

        String hoTen = payload.get("hoTen");
        String email = payload.get("email");
        String soDienThoai = payload.get("soDienThoai");
        String ngaySinhStr = payload.get("ngaySinh");
        String gioiTinhStr = payload.get("gioiTinh");
        String diaChiChiTiet = payload.get("diaChi");

        if (hoTen != null && !hoTen.isBlank()) kh.setHoTen(hoTen.trim());
        if (email != null && !email.isBlank()) kh.setEmail(email.trim());
        if (soDienThoai != null && !soDienThoai.isBlank()) kh.setSoDienThoai(soDienThoai.trim());
        if (gioiTinhStr != null) kh.setGioiTinh("true".equalsIgnoreCase(gioiTinhStr) || "1".equals(gioiTinhStr));

        if (ngaySinhStr != null && !ngaySinhStr.isBlank()) {
            try {
                kh.setNgaySinh(LocalDate.parse(ngaySinhStr.trim()));
            } catch (Exception ignored) {}
        }

        KhachHang saved = khachHangRepository.save(kh);

        if (diaChiChiTiet != null && !diaChiChiTiet.isBlank()) {
            DiaChi dc = diaChiRepository.findByKhachHangIdAndMacDinhTrue(saved.getId())
                    .orElse(DiaChi.builder()
                            .khachHang(saved)
                            .macDinh(true)
                            .loaiDiaChi("Nhà riêng")
                            .build());
            dc.setTenNguoiNhan(saved.getHoTen());
            dc.setSdt(saved.getSoDienThoai());
            dc.setDiaChiChiTiet(diaChiChiTiet.trim());
            diaChiRepository.save(dc);
        }

        return saved;
    }

    @Override
    @Transactional
    public void changePassword(Long userId, String oldPassword, String newPassword) {
        if (oldPassword == null || newPassword == null || newPassword.trim().length() < 6) {
            throw new IllegalArgumentException("Mật khẩu mới phải có ít nhất 6 ký tự!");
        }

        KhachHang kh = khachHangRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản!"));

        if (!kh.getMatKhau().equals(oldPassword.trim())) {
            throw new IllegalArgumentException("Mật khẩu hiện tại không chính xác!");
        }

        kh.setMatKhau(newPassword.trim());
        khachHangRepository.save(kh);
    }

    @Override
    public List<HoaDonDTO> getMyOrders(Long userId, String soDienThoai) {
        List<HoaDon> list = hoaDonRepository.findByKhachHangIdOrSdtNguoiNhan(userId, soDienThoai);
        return list.stream()
                .map(h -> hoaDonService.findById(h.getId()).orElse(null))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public KhachHang register(Map<String, String> payload) {
        String hoTen = payload.get("hoTen");
        String email = payload.get("email");
        String soDienThoai = payload.get("soDienThoai");
        String matKhau = payload.get("matKhau");
        String ngaySinhStr = payload.get("ngaySinh");
        String gioiTinhStr = payload.get("gioiTinh");
        String diaChi = payload.get("diaChi");

        if (hoTen == null || hoTen.trim().isEmpty()) {
            throw new IllegalArgumentException("Họ và tên không được để trống!");
        }
        if (hoTen.trim().length() < 2 || hoTen.trim().length() > 100) {
            throw new IllegalArgumentException("Họ và tên phải từ 2 đến 100 ký tự!");
        }

        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("Email không được để trống!");
        }
        String emailRegex = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,6}$";
        if (!email.trim().matches(emailRegex)) {
            throw new IllegalArgumentException("Địa chỉ email không đúng định dạng!");
        }
        if (khachHangRepository.existsByEmail(email.trim())) {
            throw new IllegalArgumentException("Địa chỉ email này đã được sử dụng!");
        }

        if (soDienThoai == null || soDienThoai.trim().isEmpty()) {
            throw new IllegalArgumentException("Số điện thoại không được để trống!");
        }
        String phoneRegex = "^(0[35789])[0-9]{8}$";
        if (!soDienThoai.trim().matches(phoneRegex)) {
            throw new IllegalArgumentException("Số điện thoại phải gồm 10 chữ số và bắt đầu bằng đầu số VN (03, 05, 07, 08, 09)!");
        }
        if (khachHangRepository.existsBySoDienThoai(soDienThoai.trim())) {
            throw new IllegalArgumentException("Số điện thoại này đã được sử dụng!");
        }

        if (matKhau == null || matKhau.trim().isEmpty()) {
            throw new IllegalArgumentException("Mật khẩu không được để trống!");
        }
        if (matKhau.trim().length() < 6) {
            throw new IllegalArgumentException("Mật khẩu phải chứa ít nhất 6 ký tự!");
        }

        LocalDate ngaySinh = null;
        if (ngaySinhStr != null && !ngaySinhStr.trim().isEmpty()) {
            try {
                ngaySinh = LocalDate.parse(ngaySinhStr.trim());
                if (ngaySinh.isAfter(LocalDate.now())) {
                    throw new IllegalArgumentException("Ngày sinh không được ở tương lai!");
                }
            } catch (Exception e) {
                if (e instanceof IllegalArgumentException) throw e;
                throw new IllegalArgumentException("Ngày sinh không hợp lệ (định dạng yyyy-MM-dd)!");
            }
        }

        Boolean gioiTinh = true;
        if (gioiTinhStr != null && !gioiTinhStr.trim().isEmpty()) {
            gioiTinh = Boolean.parseBoolean(gioiTinhStr.trim());
        }

        String prefix = "KH";
        Optional<KhachHang> lastKh = khachHangRepository.findFirstByMaKhachHangStartingWithOrderByMaKhachHangDesc(prefix);
        String newCode = "KH00001";
        if (lastKh.isPresent()) {
            String lastCode = lastKh.get().getMaKhachHang();
            try {
                int num = Integer.parseInt(lastCode.substring(2));
                newCode = String.format("KH%05d", num + 1);
            } catch (Exception e) {
                newCode = "KH" + (System.currentTimeMillis() % 100000);
            }
        }

        KhachHang kh = KhachHang.builder()
                .maKhachHang(newCode)
                .hoTen(hoTen.trim())
                .email(email.trim())
                .soDienThoai(soDienThoai.trim())
                .matKhau(matKhau.trim())
                .ngaySinh(ngaySinh)
                .gioiTinh(gioiTinh)
                .trangThai(1)
                .ngayTao(LocalDateTime.now())
                .build();

        KhachHang saved = khachHangRepository.save(kh);

        if (diaChi != null && !diaChi.isBlank()) {
            DiaChi dc = DiaChi.builder()
                    .khachHang(saved)
                    .tenNguoiNhan(hoTen.trim())
                    .sdt(soDienThoai.trim())
                    .diaChiChiTiet(diaChi.trim())
                    .loaiDiaChi("Nhà riêng")
                    .macDinh(true)
                    .ngayTao(LocalDateTime.now())
                    .build();
            diaChiRepository.save(dc);
        }

        return saved;
    }

    @Override
    public KhachHang login(String emailOrPhone, String matKhau) {
        if (emailOrPhone == null || emailOrPhone.trim().isEmpty()) {
            throw new IllegalArgumentException("Vui lòng nhập Email hoặc Số điện thoại!");
        }
        if (matKhau == null || matKhau.trim().isEmpty()) {
            throw new IllegalArgumentException("Vui lòng nhập mật khẩu!");
        }

        String credential = emailOrPhone.trim();
        Optional<KhachHang> opt = Optional.empty();

        if (credential.contains("@")) {
            List<KhachHang> list = khachHangRepository.findAllByEmail(credential);
            if (!list.isEmpty()) {
                opt = list.stream().filter(k -> k.getMatKhau() != null && matKhau.trim().equals(k.getMatKhau())).findFirst();
                if (opt.isEmpty()) opt = Optional.of(list.get(0));
            }
        } else {
            List<KhachHang> list = khachHangRepository.findAllBySoDienThoai(credential);
            if (!list.isEmpty()) {
                opt = list.stream().filter(k -> k.getMatKhau() != null && matKhau.trim().equals(k.getMatKhau())).findFirst();
                if (opt.isEmpty()) opt = Optional.of(list.get(0));
            }
        }

        if (opt.isEmpty()) {
            throw new NoSuchElementException("Tài khoản không tồn tại!");
        }

        KhachHang kh = opt.get();
        if (!kh.getMatKhau().equals(matKhau.trim())) {
            throw new SecurityException("Mật khẩu không chính xác!");
        }

        if (kh.getTrangThai() == null || kh.getTrangThai() != 1) {
            throw new IllegalStateException("Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động!");
        }

        return kh;
    }

    @Override
    public Map<String, Object> getCurrentUserInfo(KhachHang kh) {
        if (kh == null) {
            return Map.of("loggedIn", false);
        }

        String userAddress = "";
        Optional<DiaChi> defaultDc = diaChiRepository.findByKhachHangIdAndMacDinhTrue(kh.getId());
        if (defaultDc.isPresent()) {
            userAddress = defaultDc.get().getDiaChiChiTiet();
        }

        Map<String, Object> userMap = new LinkedHashMap<>();
        userMap.put("id", kh.getId());
        userMap.put("maKhachHang", kh.getMaKhachHang() != null ? kh.getMaKhachHang() : "");
        userMap.put("hoTen", kh.getHoTen() != null ? kh.getHoTen() : "");
        userMap.put("email", kh.getEmail() != null ? kh.getEmail() : "");
        userMap.put("soDienThoai", kh.getSoDienThoai() != null ? kh.getSoDienThoai() : "");
        userMap.put("diaChi", userAddress);
        userMap.put("ngaySinh", kh.getNgaySinh() != null ? kh.getNgaySinh().toString() : "");
        userMap.put("gioiTinh", kh.getGioiTinh() != null ? kh.getGioiTinh() : true);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("loggedIn", true);
        resp.put("user", userMap);
        return resp;
    }
}
