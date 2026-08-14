package com.example.be.repository;

import com.example.be.entity.DanhMuc;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface DanhMucRepository extends JpaRepository<DanhMuc, Long> {
    @Query("SELECT d FROM DanhMuc d WHERE (:keyword IS NULL OR (LOWER(d.tenDanhMuc) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(d.maDanhMuc) LIKE LOWER(CONCAT('%', :keyword, '%')))) AND (:trangThai IS NULL OR d.trangThai = :trangThai)")
    Page<DanhMuc> search(@Param("keyword") String keyword, @Param("trangThai") Boolean trangThai, Pageable pageable);
}
