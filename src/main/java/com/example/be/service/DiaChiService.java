package com.example.be.service;

import com.example.be.entity.DiaChi;
import com.example.be.dto.DiaChiDto;

import java.util.List;

public interface DiaChiService {
    List<DiaChi> findByKhachHangId(Long khachHangId);
    
    DiaChi addDiaChi(Long khachHangId, DiaChiDto dto);
    
    DiaChi updateDiaChi(Long addressId, DiaChiDto dto);
    
    void deleteDiaChi(Long addressId);
    
    DiaChi setDefaultDiaChi(Long addressId);
}
