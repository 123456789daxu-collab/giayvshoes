package com.example.be.service;

import com.example.be.dto.DotGiamGiaDto;
import com.example.be.dto.SanPhamChiTietDto;
import com.example.be.entity.DotGiamGia;
import org.springframework.data.domain.Page;

import java.time.LocalDateTime;
import java.util.List;

public interface DotGiamGiaService {

    Page<DotGiamGia> searchCampaigns(String search, LocalDateTime start, LocalDateTime end, Integer trangThai, int page, int size);

    DotGiamGia findById(Long id);

    DotGiamGia createCampaign(DotGiamGiaDto dto);

    DotGiamGia updateCampaign(Long id, DotGiamGiaDto dto);

    DotGiamGia toggleStatus(Long id, Integer status);

    List<Long> getProductDetailIdsByCampaignId(Long campaignId);

    Page<SanPhamChiTietDto> getProductDetails(String search, int page, int size);

    byte[] exportExcel(String search, LocalDateTime start, LocalDateTime end, Integer trangThai) throws Exception;
}
