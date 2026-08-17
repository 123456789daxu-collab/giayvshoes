package com.example.be.repository;

import com.example.be.entity.GiaoCa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GiaoCaRepository extends JpaRepository<GiaoCa, Long> {
    List<GiaoCa> findByTrangThai(Integer trangThai);
    GiaoCa findFirstByTrangThaiOrderByIdDesc(Integer trangThai);
}
