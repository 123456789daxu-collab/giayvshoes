package com.example.be.repository;

import com.example.be.entity.NhanVien;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NhanVienRepository extends JpaRepository<NhanVien, Long> {

    @Query("SELECT n FROM NhanVien n WHERE " +
           "LOWER(n.maNhanVien) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(n.hoTen) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(n.email) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(n.soDienThoai) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<NhanVien> searchByKeyword(@Param("keyword") String keyword);

    List<NhanVien> findByTrangThai(Integer trangThai);
}
