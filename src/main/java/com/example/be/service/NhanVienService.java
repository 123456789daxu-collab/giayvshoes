package com.example.be.service;

import com.example.be.entity.NhanVien;
import com.example.be.repository.NhanVienRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class NhanVienService {

    private final NhanVienRepository nhanVienRepository;
    private final NotificationService notificationService;

    public NhanVienService(NhanVienRepository nhanVienRepository, NotificationService notificationService) {
        this.nhanVienRepository = nhanVienRepository;
        this.notificationService = notificationService;
    }

    public List<NhanVien> findAll() {
        return nhanVienRepository.findAll();
    }

    public Optional<NhanVien> findById(Long id) {
        return nhanVienRepository.findById(id);
    }

    public NhanVien save(NhanVien nhanVien) {
        boolean isNew = nhanVien.getId() == null;
        String unencryptedPassword = nhanVien.getMatKhau(); // Keep plain text to send in email
        
        NhanVien saved = nhanVienRepository.save(nhanVien);
        
        // If it's a newly created employee, send notifications
        if (isNew) {
            notificationService.sendEmailNotification(saved.getEmail(), saved.getHoTen(), unencryptedPassword);
            notificationService.sendSmsNotification(saved.getSoDienThoai(), saved.getHoTen());
        }
        
        return saved;
    }

    public void deleteById(Long id) {
        nhanVienRepository.deleteById(id);
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
}
