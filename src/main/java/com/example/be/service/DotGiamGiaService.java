package com.example.be.service;

import com.example.be.dto.DotGiamGiaDto;
import com.example.be.dto.SanPhamChiTietGiamGiaDto;
import com.example.be.entity.DotGiamGia;
import org.springframework.data.domain.Page;

import java.time.LocalDateTime;
import java.util.List;

public interface DotGiamGiaService {
    Page<DotGiamGia> searchCampaigns(
            String search,
            LocalDateTime start,
            LocalDateTime end,
            Integer trangThai,
            String hinhThucGiam,
            java.math.BigDecimal giaTriGiam,
            int page,
            int size
    );
    
    DotGiamGia findById(Long id);
    
    DotGiamGia createCampaign(DotGiamGiaDto dto);
    
    DotGiamGia updateCampaign(Long id, DotGiamGiaDto dto);
    
    DotGiamGia toggleStatus(Long id, Integer status);
    
    void deleteCampaign(Long id);
    
    List<Long> getProductDetailIdsByCampaignId(Long campaignId);
    
    Page<SanPhamChiTietGiamGiaDto> getProductDetails(String search, int page, int size);
    
    byte[] exportExcel(
            String search,
            LocalDateTime start,
            LocalDateTime end,
            Integer trangThai,
            String hinhThucGiam,
            java.math.BigDecimal giaTriGiam
    ) throws Exception;
}
