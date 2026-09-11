package com.example.be.service;

import com.example.be.entity.LichLamViec;
import com.example.be.repository.LichLamViecRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class LichLamViecService {
    private final LichLamViecRepository lichLamViecRepository;

    public LichLamViecService(LichLamViecRepository lichLamViecRepository) {
        this.lichLamViecRepository = lichLamViecRepository;
    }

    public List<LichLamViec> findAll() {
        return lichLamViecRepository.findAll();
    }

    public LichLamViec save(LichLamViec lichLamViec) {
        if (lichLamViec.getId() == null && lichLamViec.getNhanVien() != null && lichLamViec.getCaLam() != null && lichLamViec.getNgayLamViec() != null) {
            boolean exists = lichLamViecRepository.existsByNhanVienIdAndCaLamIdAndNgayLamViec(
                    lichLamViec.getNhanVien().getId(),
                    lichLamViec.getCaLam().getId(),
                    lichLamViec.getNgayLamViec()
            );
            if (exists) {
                throw new IllegalArgumentException("Nhân viên đã được phân ca vào ngày này.");
            }
        }
        return lichLamViecRepository.save(lichLamViec);
    }

    public LichLamViec findById(Long id) {
        return lichLamViecRepository.findById(id).orElse(null);
    }

    // KHONG DUNG XOA CUNG
    /*
    public void deleteById(Long id) {
        lichLamViecRepository.deleteById(id);
    }
    */

    public List<LichLamViec> findByNgayLamViecBetween(LocalDate start, LocalDate end) {
        return lichLamViecRepository.findByNgayLamViecBetween(start, end);
    }
}
