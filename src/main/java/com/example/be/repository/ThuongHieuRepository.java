package com.example.be.repository;

import com.example.be.entity.ThuongHieu;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ThuongHieuRepository extends JpaRepository<ThuongHieu, Long> {
    @Query("SELECT t FROM ThuongHieu t WHERE (:keyword IS NULL OR (LOWER(t.tenThuongHieu) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(t.maThuongHieu) LIKE LOWER(CONCAT('%', :keyword, '%')))) AND (:trangThai IS NULL OR t.trangThai = :trangThai)")
    Page<ThuongHieu> search(@Param("keyword") String keyword, @Param("trangThai") Boolean trangThai, Pageable pageable);
}
