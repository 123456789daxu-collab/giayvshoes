package com.example.be.repository;

import com.example.be.entity.DiaChi;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DiaChiRepository extends JpaRepository<DiaChi, Long> {
    List<DiaChi> findByKhachHangId(Long khachHangId);
    Optional<DiaChi> findByKhachHangIdAndMacDinhTrue(Long khachHangId);
}
