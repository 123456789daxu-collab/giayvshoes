package com.example.be.service;

import com.example.be.entity.NhanVien;
import com.example.be.repository.NhanVienRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import com.example.be.repository.HoaDonRepository;

@Service
public class NhanVienService {

    private final NhanVienRepository nhanVienRepository;
    private final NotificationService notificationService;

    private final HoaDonRepository hoaDonRepository;

    public NhanVienService(NhanVienRepository nhanVienRepository, NotificationService notificationService, HoaDonRepository hoaDonRepository) {
        this.nhanVienRepository = nhanVienRepository;
        this.notificationService = notificationService;
        this.hoaDonRepository = hoaDonRepository;
    }

    public List<NhanVien> findAll() {
        return nhanVienRepository.findAll(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "id"));
    }

    public Optional<NhanVien> findById(Long id) {
        return nhanVienRepository.findById(id);
    }

    public NhanVien save(NhanVien nhanVien) {
        boolean isNew = nhanVien.getId() == null;

        if (nhanVien.getNgaySinh() != null) {
            if (nhanVien.getNgaySinh().isAfter(java.time.LocalDate.now())) {
                throw new RuntimeException("Ngày sinh không được ở tương lai!");
            }
            if (nhanVien.getNgaySinh().isAfter(java.time.LocalDate.now().minusYears(18))) {
                throw new RuntimeException("Nhân viên phải đủ 18 tuổi!");
            }
        }

        // Kiểm tra trùng lặp
        if (isNew) {
            if (nhanVien.getEmail() != null && !nhanVien.getEmail().trim().isEmpty() && nhanVienRepository.existsByEmail(nhanVien.getEmail())) {
                throw new RuntimeException("Email đã tồn tại trong hệ thống!");
            }
            if (nhanVien.getSoDienThoai() != null && !nhanVien.getSoDienThoai().trim().isEmpty() && nhanVienRepository.existsBySoDienThoai(nhanVien.getSoDienThoai())) {
                throw new RuntimeException("Số điện thoại đã tồn tại trong hệ thống!");
            }
        } else {
            if (nhanVien.getEmail() != null && !nhanVien.getEmail().trim().isEmpty() && nhanVienRepository.existsByEmailAndIdNot(nhanVien.getEmail(), nhanVien.getId())) {
                throw new RuntimeException("Email đã tồn tại ở một nhân viên khác!");
            }
            if (nhanVien.getSoDienThoai() != null && !nhanVien.getSoDienThoai().trim().isEmpty() && nhanVienRepository.existsBySoDienThoaiAndIdNot(nhanVien.getSoDienThoai(), nhanVien.getId())) {
                throw new RuntimeException("Số điện thoại đã tồn tại ở một nhân viên khác!");
            }
        }

        String unencryptedPassword = nhanVien.getMatKhau(); // Keep plain text to send in email
        
        NhanVien saved = nhanVienRepository.save(nhanVien);
        
        // Auto-generate maNhanVien if empty
        if (saved.getMaNhanVien() == null || saved.getMaNhanVien().isEmpty()) {
            String maxMa = nhanVienRepository.findMaxMaNhanVien();
            int nextNumber = 1;
            if (maxMa != null && maxMa.startsWith("NV")) {
                try {
                    nextNumber = Integer.parseInt(maxMa.substring(2)) + 1;
                } catch (Exception e) {
                    // Ignore parsing errors, keep default 1 or handle fallback
                }
            }
            saved.setMaNhanVien(String.format("NV%03d", nextNumber));
            saved = nhanVienRepository.save(saved);
        }
        
        // If it's a newly created employee, send notifications
        if (isNew) {
            notificationService.sendEmailNotification(saved.getEmail(), saved.getHoTen(), unencryptedPassword);
            notificationService.sendSmsNotification(saved.getSoDienThoai(), saved.getHoTen());
        }
        
        return saved;
    }

    @org.springframework.transaction.annotation.Transactional
    public void deleteById(Long id) {
        // Thực hiện xóa mềm (chuyển trạng thái về 0 - Nghỉ làm) thay vì xóa cứng
        NhanVien nv = nhanVienRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhân viên với id: " + id));
        nv.setTrangThai(0);
        nhanVienRepository.save(nv);
    }

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

    public String getNextMaNhanVien() {
        String maxMa = nhanVienRepository.findMaxMaNhanVien();
        int nextNumber = 1;
        if (maxMa != null && maxMa.startsWith("NV")) {
            try {
                nextNumber = Integer.parseInt(maxMa.substring(2)) + 1;
            } catch (Exception e) {
            }
        }
        return String.format("NV%03d", nextNumber);
    }
}
