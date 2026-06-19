package com.example.be.service;

import com.example.be.entity.PhieuGiamGia;
import com.example.be.dto.PhieuGiamGiaDto;
import com.example.be.dto.KhachHangVoucherDto;
import org.springframework.data.domain.Page;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;

public interface PhieuGiamGiaService {
    
    // Search, paginate and filter vouchers
    Page<PhieuGiamGia> searchVouchers(
            String search, 
            String loaiGiamGia, 
            String loaiPhieu, 
            LocalDateTime start, 
            LocalDateTime end, 
            int page, 
            int size
    );
    
    // Get single voucher details
    PhieuGiamGia findById(Long id);

    String getNextMaVoucher();
    
    // Create new voucher
    PhieuGiamGia createVoucher(PhieuGiamGiaDto dto);
    
    // Update existing voucher
    PhieuGiamGia updateVoucher(Long id, PhieuGiamGiaDto dto);
    
    // Toggle voucher status (1: Active, 0: Inactive)
    PhieuGiamGia toggleStatus(Long id, Integer status);
    
    // Get customer statistics with order count and total spent for voucher recipient selection
    Page<KhachHangVoucherDto> getCustomerStatistics(
            String search, 
            Integer orderMonth, 
            Integer orderYear, 
            int page, 
            int size
    );
    
    // Get customer IDs associated with a specific individual voucher
    List<Long> getCustomerIdsByVoucherId(Long voucherId);
    
    // Export vouchers to Excel
    byte[] exportExcel(
            String search, 
            String loaiGiamGia, 
            String loaiPhieu, 
            LocalDateTime start, 
            LocalDateTime end
    ) throws IOException;
}
