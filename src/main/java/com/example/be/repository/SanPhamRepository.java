package com.example.be.repository;

import com.example.be.entity.SanPham;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.repository.query.Param;

@Repository
public interface SanPhamRepository extends JpaRepository<SanPham, Long>, JpaSpecificationExecutor<SanPham> {

    @Query("SELECT s FROM SanPham s WHERE " +
           "(:keyword IS NULL OR LOWER(s.maSanPham) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(s.tenSanPham) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND " +
           "(:idThuongHieu IS NULL OR s.thuongHieu.id = :idThuongHieu) AND " +
           "(:idLoaiGiay IS NULL OR s.loaiGiay.id = :idLoaiGiay) AND " +
           "(:trangThai IS NULL OR s.trangThai = :trangThai)")
    Page<SanPham> searchFilter(
            @Param("keyword") String keyword,
            @Param("idThuongHieu") Long idThuongHieu,
            @Param("idLoaiGiay") Long idLoaiGiay,
            @Param("trangThai") Integer trangThai,
            Pageable pageable);

    @Query("SELECT s FROM SanPham s " +
           "LEFT JOIN s.thuongHieu th " +
           "LEFT JOIN s.loaiGiay lg " +
           "WHERE (:keyword IS NULL OR LOWER(s.tenSanPham) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(s.maSanPham) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "AND (:trangThai IS NULL OR s.trangThai = :trangThai) " +
           "AND (:soLuongTon IS NULL OR s.soLuong <= :soLuongTon) " +
           "AND (:idThuongHieu IS NULL OR th.id = :idThuongHieu) " +
           "AND (:idLoaiGiay IS NULL OR lg.id = :idLoaiGiay)")
    Page<SanPham> search(@Param("keyword") String keyword, 
                         @Param("trangThai") Integer trangThai, 
                         @Param("soLuongTon") Integer soLuongTon, 
                         @Param("idThuongHieu") Long idThuongHieu, 
                         @Param("idLoaiGiay") Long idLoaiGiay, 
                         Pageable pageable);
    
    boolean existsByTenSanPham(String tenSanPham);
    boolean existsByMaSanPham(String maSanPham);
}
