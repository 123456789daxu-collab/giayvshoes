package com.example.be.service;

import com.example.be.entity.SanPham;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface SanPhamService {
    Page<SanPham> search(String keyword, Integer trangThai, Integer soLuongTon, Long idThuongHieu, Long idLoaiGiay, java.math.BigDecimal minPrice, java.math.BigDecimal maxPrice, Pageable pageable);
    SanPham findById(Long id);
    SanPham save(SanPham sanPham);
    // KHONG DUNG XOA CUNG (SOFT DELETE / TOGGLE STATUS ONLY)
    // void deleteById(Long id);
    boolean existsByTenSanPham(String tenSanPham);
    SanPham findByTenSanPham(String tenSanPham);
    boolean existsByMaSanPham(String maSanPham);
    String generateNextMaSanPham();

    List<SanPham> getAll();
    long countTotalProducts();
    long countActiveProducts();
    long countInactiveProducts();
    Page<SanPham> getPage(int pageNo, int pageSize);
    Page<SanPham> searchFilter(String keyword, Long idThuongHieu, Long idLoaiGiay, Integer trangThai, String sort, int pageNo, int pageSize);
    SanPham getById(Long id);
    SanPham update(Long id, SanPham sanPham);
    // void delete(Long id);
    void toggleStatus(Long id);

    Page<com.example.be.entity.SanPhamChiTiet> getVariantsBySanPhamId(Long sanPhamId, Pageable pageable);
    Page<com.example.be.entity.SanPhamChiTiet> searchVariantsGlobal(String keyword, Pageable pageable);
    com.example.be.entity.SanPhamChiTiet getVariantById(Long id);
    java.util.Map<String, Object> calculateDiscounts(List<com.example.be.entity.SanPhamChiTiet> variants);
    void updateVariant(Long id, java.math.BigDecimal giaBan, java.math.BigDecimal giaNhap, Integer soLuongTon, Integer trangThai, String imageBase64);
    void updateVariantFull(Long id, Long idThuongHieu, Long idChatLieu, Long idDanhMuc, Long idLoaiGiay, String moTaChiTiet, Long idMauSac, Long idCoGiay, Double trangLuong, java.math.BigDecimal giaNhap, java.math.BigDecimal giaBan, Integer soLuongTon, Integer trangThai, String imageBase64);
    void toggleStatusVariant(Long id);
    int toggleProductStatus(Long id);
    void saveProductWithVariants(SanPham sanPham, List<Long> variantSizes, List<Long> variantColors, List<Integer> variantQuantities, List<java.math.BigDecimal> variantPrices, List<java.math.BigDecimal> variantImportPrices, List<String> variantImages);
    void syncMissingPricesAndQuantities();
    byte[] exportExcel(List<SanPham> listSanPham) throws java.io.IOException;

    java.util.Map<String, Object> getFlashSaleData();
    java.util.List<java.util.Map<String, Object>> checkCartStatus(java.util.List<Long> spctIds);
    java.util.List<java.util.Map<String, Object>> searchForSale(String keyword);
    java.util.Map<String, Object> getDetailBySpctId(Long spctId);
    java.util.Map<String, Object> reduceStock(Long id, Integer quantity);
    java.util.Map<String, Object> increaseStock(Long id, Integer quantity);
}
