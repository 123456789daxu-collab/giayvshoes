package com.example.be.repository;

import com.example.be.entity.PhieuGiamGia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PhieuGiamGiaRepository extends JpaRepository<PhieuGiamGia, Long>, JpaSpecificationExecutor<PhieuGiamGia> {
    
    // Find the largest voucher code with a prefix to auto-generate codes like PGG00001
    Optional<PhieuGiamGia> findFirstByMaVoucherStartingWithOrderByMaVoucherDesc(String prefix);
}
