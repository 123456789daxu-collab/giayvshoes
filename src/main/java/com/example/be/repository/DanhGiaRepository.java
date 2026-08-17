package com.example.be.repository;

import com.example.be.entity.DanhGia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DanhGiaRepository extends JpaRepository<DanhGia, Long> {

    /** Kiểm tra đơn hàng này đã được đánh giá chưa */
    boolean existsByHoaDon_Id(Long hoaDonId);

    /** Lấy đánh giá theo hóa đơn */
    Optional<DanhGia> findByHoaDon_Id(Long hoaDonId);

    /** Lấy tất cả đánh giá của sản phẩm (hiển thị công khai) */
    @Query("SELECT d FROM DanhGia d WHERE d.sanPham.id = :sanPhamId AND d.trangThai = 1 ORDER BY d.ngayTao DESC")
    List<DanhGia> findBySanPhamId(@Param("sanPhamId") Long sanPhamId);

    /** Điểm trung bình của sản phẩm */
    @Query("SELECT AVG(d.soSao) FROM DanhGia d WHERE d.sanPham.id = :sanPhamId AND d.trangThai = 1")
    Double avgSoSaoBySpId(@Param("sanPhamId") Long sanPhamId);
}
