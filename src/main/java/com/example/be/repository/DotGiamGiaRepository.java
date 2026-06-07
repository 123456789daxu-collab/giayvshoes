package com.example.be.repository;

import com.example.be.entity.DotGiamGia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DotGiamGiaRepository extends JpaRepository<DotGiamGia, Long>, JpaSpecificationExecutor<DotGiamGia> {
    
    // Find the largest discount campaign code starting with a prefix to auto-generate codes like DGG001
    Optional<DotGiamGia> findFirstByMaDotGiamGiaStartingWithOrderByMaDotGiamGiaDesc(String prefix);
}
