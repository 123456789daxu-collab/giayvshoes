package com.example.be.repository;

import com.example.be.entity.LichSuThanhToan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LichSuThanhToanRepository extends JpaRepository<LichSuThanhToan, Long> {
    List<LichSuThanhToan> findByHoaDonId(Long idHoaDon);
}
