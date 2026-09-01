package com.example.be.repository;

import com.example.be.entity.LichLamViec;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface LichLamViecRepository extends JpaRepository<LichLamViec, Long> {
    List<LichLamViec> findByNgayLamViecBetween(LocalDate startDate, LocalDate endDate);
    List<LichLamViec> findByNhanVienId(Long nhanVienId);
    
    boolean existsByNhanVienIdAndCaLamIdAndNgayLamViec(Long nhanVienId, Long caLamId, LocalDate ngayLamViec);
}
