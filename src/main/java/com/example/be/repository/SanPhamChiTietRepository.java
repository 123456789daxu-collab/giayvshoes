package com.example.be.repository;

import com.example.be.entity.SanPhamChiTiet;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

@Repository
public interface SanPhamChiTietRepository extends JpaRepository<SanPhamChiTiet, Long>, JpaSpecificationExecutor<SanPhamChiTiet> {
    
    @Query("SELECT s FROM SanPhamChiTiet s WHERE s.sanPham.id = :sanPhamId")
    Page<SanPhamChiTiet> findBySanPhamId(@Param("sanPhamId") Long sanPhamId, Pageable pageable);
    
    @Query("SELECT s FROM SanPhamChiTiet s WHERE s.sanPham.id = :sanPhamId")
    List<SanPhamChiTiet> findBySanPhamId(@Param("sanPhamId") Long sanPhamId);

    @Query("SELECT s.sanPham.id, MIN(s.giaBan), MAX(s.giaBan) FROM SanPhamChiTiet s WHERE s.sanPham.id IN :sanPhamIds GROUP BY s.sanPham.id")
    List<Object[]> findMinMaxGiaBanBySanPhamIds(@Param("sanPhamIds") List<Long> sanPhamIds);
}
