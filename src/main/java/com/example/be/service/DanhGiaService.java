package com.example.be.service;

import com.example.be.entity.DanhGia;
import com.example.be.entity.KhachHang;

import java.util.List;
import java.util.Map;

public interface DanhGiaService {

    List<Map<String, Object>> getAllReviews();

    List<Map<String, Object>> getReviewsByProduct();

    Map<String, Object> analyzeProductReviews(Long productId);

    Map<String, Object> getStats();

    DanhGia replyReview(Long id, String phanHoi, String nguoiPhanHoi);

    DanhGia toggleVisibility(Long id);

    void deleteReview(Long id);

    Map<String, Object> checkReviewed(Long hoaDonId);

    Map<String, Object> checkBatchReviewed(List<Integer> hoaDonIds);

    List<Map<String, Object>> getClientReviewsByProduct(Long sanPhamId);

    Map<String, Map<String, Object>> getSummaryAll();

    DanhGia createReview(Map<String, Object> payload, KhachHang sessionUser);

    DanhGia createDirectReview(Map<String, Object> payload, KhachHang sessionUser);
}
