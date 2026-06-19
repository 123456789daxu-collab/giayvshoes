package com.example.be.repository;

import com.example.be.entity.SanPhamChiTiet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SanPhamChiTietRepository extends JpaRepository<SanPhamChiTiet, Long>, JpaSpecificationExecutor<SanPhamChiTiet> {
    @Query("SELECT s.id FROM SanPhamChiTiet s WHERE s.sanPham.id = :sanPhamId AND s.trangThai = 1")
    List<Long> findActiveIdsBySanPhamId(@Param("sanPhamId") Long sanPhamId);
}

