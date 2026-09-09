package com.example.be.repository;

import com.example.be.entity.DotGiamGia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DotGiamGiaRepository extends JpaRepository<DotGiamGia, Long>, JpaSpecificationExecutor<DotGiamGia> {
    Optional<DotGiamGia> findFirstByMaDotGiamGiaStartingWithOrderByMaDotGiamGiaDesc(String prefix);

    @Query("SELECT d FROM DotGiamGia d WHERE d.trangThai = 1 AND d.ngayBatDau <= CURRENT_TIMESTAMP AND d.ngayKetThuc >= CURRENT_TIMESTAMP ORDER BY d.ngayKetThuc ASC")
    List<DotGiamGia> findActiveCampaigns();

    boolean existsByMaDotGiamGia(String maDotGiamGia);
}
