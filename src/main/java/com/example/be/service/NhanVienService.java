package com.example.be.service;

import com.example.be.entity.NhanVien;
import com.example.be.repository.NhanVienRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class NhanVienService {

    private final NhanVienRepository nhanVienRepository;
    private final NotificationService notificationService;
    private final MaGeneratorService maGeneratorService;

    public NhanVienService(NhanVienRepository nhanVienRepository,
                           NotificationService notificationService,
                           MaGeneratorService maGeneratorService) {
        this.nhanVienRepository = nhanVienRepository;
        this.notificationService = notificationService;
        this.maGeneratorService = maGeneratorService;
    }

    public List<NhanVien> findAll() {
        return nhanVienRepository.findAll(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "id"));
    }

    public Optional<NhanVien> findById(Long id) {
        return nhanVienRepository.findById(id);
    }

    public String generateNextMaNhanVien() {
        return maGeneratorService.generateMaNhanVien();
    }

    public NhanVien save(NhanVien nhanVien) {
        boolean isNew = nhanVien.getId() == null;
        
        if (isNew) {
            if (nhanVien.getMaNhanVien() == null || nhanVien.getMaNhanVien().trim().isEmpty()) {
                nhanVien.setMaNhanVien(generateNextMaNhanVien());
            } else {
                nhanVien.setMaNhanVien(nhanVien.getMaNhanVien().trim());
            }
        }

        // Kiểm tra trùng lặp
        if (isNew) {
            if (nhanVien.getMaNhanVien() != null && nhanVienRepository.existsByMaNhanVien(nhanVien.getMaNhanVien())) {
                throw new RuntimeException("Mã nhân viên đã tồn tại trong hệ thống!");
            }
            if (nhanVien.getEmail() != null && !nhanVien.getEmail().trim().isEmpty() && nhanVienRepository.existsByEmail(nhanVien.getEmail())) {
                throw new RuntimeException("Email đã tồn tại trong hệ thống!");
            }
            if (nhanVien.getSoDienThoai() != null && !nhanVien.getSoDienThoai().trim().isEmpty() && nhanVienRepository.existsBySoDienThoai(nhanVien.getSoDienThoai())) {
                throw new RuntimeException("Số điện thoại đã tồn tại trong hệ thống!");
            }
        } else {
            if (nhanVien.getMaNhanVien() != null && nhanVienRepository.existsByMaNhanVienAndIdNot(nhanVien.getMaNhanVien(), nhanVien.getId())) {
                throw new RuntimeException("Mã nhân viên đã tồn tại ở một nhân viên khác!");
            }
            if (nhanVien.getEmail() != null && !nhanVien.getEmail().trim().isEmpty() && nhanVienRepository.existsByEmailAndIdNot(nhanVien.getEmail(), nhanVien.getId())) {
                throw new RuntimeException("Email đã tồn tại ở một nhân viên khác!");
            }
            if (nhanVien.getSoDienThoai() != null && !nhanVien.getSoDienThoai().trim().isEmpty() && nhanVienRepository.existsBySoDienThoaiAndIdNot(nhanVien.getSoDienThoai(), nhanVien.getId())) {
                throw new RuntimeException("Số điện thoại đã tồn tại ở một nhân viên khác!");
            }
        }

        if (nhanVien.getTrangThai() == null) {
            nhanVien.setTrangThai(1);
        }

        if (nhanVien.getGioiTinh() == null) {
            nhanVien.setGioiTinh(true);
        }

        if (nhanVien.getChucVu() == null || nhanVien.getChucVu().trim().isEmpty()) {
            nhanVien.setChucVu("Nhân viên");
        } else {
            String cv = nhanVien.getChucVu().trim();
            if ("Quản lý".equalsIgnoreCase(cv) || "admin".equalsIgnoreCase(cv) || "Quản trị viên".equalsIgnoreCase(cv) || "ADMIN".equalsIgnoreCase(cv)) {
                nhanVien.setChucVu("Quản lý");
            } else {
                nhanVien.setChucVu("Nhân viên");
            }
        }

        if (isNew && (nhanVien.getMatKhau() == null || nhanVien.getMatKhau().trim().isEmpty())) {
            String randomPass = String.format("%06d", new java.util.Random().nextInt(1000000));
            nhanVien.setMatKhau(randomPass);
        }
        
        String unencryptedPassword = nhanVien.getMatKhau(); // Keep plain text to send in email
        
        NhanVien saved = nhanVienRepository.save(nhanVien);
        
        // If it's a newly created employee, send notifications safely
        if (isNew) {
            try {
                notificationService.sendEmailNotification(saved.getEmail(), saved.getHoTen(), unencryptedPassword);
            } catch (Exception e) {
                System.err.println("Lỗi gửi email thông báo nhân viên mới: " + e.getMessage());
            }
            try {
                notificationService.sendSmsNotification(saved.getSoDienThoai(), saved.getHoTen());
            } catch (Exception e) {
                System.err.println("Lỗi gửi tin nhắn SMS thông báo nhân viên mới: " + e.getMessage());
            }
        }
        
        return saved;
    }

    // KHONG DUNG XOA CUNG (SU DUNG toggleTrangThai DE DOI TRANG THAI)
    /*
    @org.springframework.transaction.annotation.Transactional
    public void deleteById(Long id) {
        // Thực hiện xóa mềm (chuyển trạng thái về 0 - Nghỉ làm) thay vì xóa cứng
        NhanVien nv = nhanVienRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhân viên với id: " + id));
        nv.setTrangThai(0);
        nhanVienRepository.save(nv);
    }
    */

    public List<NhanVien> search(String keyword) {
        return nhanVienRepository.searchByKeyword(keyword);
    }

    public List<NhanVien> findByTrangThai(Integer trangThai) {
        return nhanVienRepository.findByTrangThai(trangThai);
    }

    public NhanVien toggleTrangThai(Long id) {
        NhanVien nv = nhanVienRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhân viên với id: " + id));
        // Toggle: 1 (Đang làm) <-> 0 (Nghỉ làm)
        nv.setTrangThai(nv.getTrangThai() != null && nv.getTrangThai() == 1 ? 0 : 1);
        return nhanVienRepository.save(nv);
    }
}
