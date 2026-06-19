package com.example.be.service.impl;

import com.example.be.entity.KhachHang;
import com.example.be.entity.DiaChi;
import com.example.be.dto.DiaChiDto;
import com.example.be.repository.KhachHangRepository;
import com.example.be.repository.DiaChiRepository;
import com.example.be.service.DiaChiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class DiaChiServiceImpl implements DiaChiService {

    @Autowired
    private DiaChiRepository diaChiRepository;

    @Autowired
    private KhachHangRepository khachHangRepository;

    @Override
    public List<DiaChi> findByKhachHangId(Long khachHangId) {
        return diaChiRepository.findByKhachHangId(khachHangId);
    }

    @Override
    @Transactional
    public DiaChi addDiaChi(Long khachHangId, DiaChiDto dto) {
        KhachHang khachHang = khachHangRepository.findById(khachHangId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng!"));

        List<DiaChi> existingAddresses = diaChiRepository.findByKhachHangId(khachHangId);
        boolean isFirst = existingAddresses.isEmpty();
        boolean isDefault = isFirst || (dto.getMacDinh() != null && dto.getMacDinh());

        if (isDefault) {
            // Unset other default addresses
            for (DiaChi da : existingAddresses) {
                if (Boolean.TRUE.equals(da.getMacDinh())) {
                    da.setMacDinh(false);
                    diaChiRepository.save(da);
                }
            }
        }

        DiaChi diaChi = DiaChi.builder()
                .khachHang(khachHang)
                .tenNguoiNhan(dto.getTenNguoiNhan() != null && !dto.getTenNguoiNhan().trim().isEmpty() ? dto.getTenNguoiNhan() : khachHang.getHoTen())
                .sdt(dto.getSdt() != null && !dto.getSdt().trim().isEmpty() ? dto.getSdt() : khachHang.getSoDienThoai())
                .tinhThanh(dto.getTinhThanh())
                .quanHuyen(dto.getQuanHuyen())
                .phuongXa(dto.getPhuongXa())
                .diaChiChiTiet(dto.getDiaChiChiTiet())
                .loaiDiaChi(dto.getLoaiDiaChi() != null ? dto.getLoaiDiaChi() : "Nhà riêng")
                .macDinh(isDefault)
                .ngayTao(LocalDateTime.now())
                .build();

        return diaChiRepository.save(diaChi);
    }

    @Override
    @Transactional
    public DiaChi updateDiaChi(Long addressId, DiaChiDto dto) {
        DiaChi diaChi = diaChiRepository.findById(addressId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy địa chỉ!"));

        boolean isDefaultRequested = dto.getMacDinh() != null && dto.getMacDinh();
        if (isDefaultRequested && !Boolean.TRUE.equals(diaChi.getMacDinh())) {
            // Unset other default addresses
            List<DiaChi> existingAddresses = diaChiRepository.findByKhachHangId(diaChi.getKhachHang().getId());
            for (DiaChi da : existingAddresses) {
                if (Boolean.TRUE.equals(da.getMacDinh())) {
                    da.setMacDinh(false);
                    diaChiRepository.save(da);
                }
            }
            diaChi.setMacDinh(true);
        } else if (!isDefaultRequested && Boolean.TRUE.equals(diaChi.getMacDinh())) {
            // Can't unset default if it's the only address
            List<DiaChi> existingAddresses = diaChiRepository.findByKhachHangId(diaChi.getKhachHang().getId());
            if (existingAddresses.size() > 1) {
                diaChi.setMacDinh(false);
                // Set another address as default
                for (DiaChi da : existingAddresses) {
                    if (!da.getId().equals(addressId)) {
                        da.setMacDinh(true);
                        diaChiRepository.save(da);
                        break;
                    }
                }
            }
        }

        diaChi.setTenNguoiNhan(dto.getTenNguoiNhan());
        diaChi.setSdt(dto.getSdt());
        diaChi.setTinhThanh(dto.getTinhThanh());
        diaChi.setQuanHuyen(dto.getQuanHuyen());
        diaChi.setPhuongXa(dto.getPhuongXa());
        diaChi.setDiaChiChiTiet(dto.getDiaChiChiTiet());
        diaChi.setLoaiDiaChi(dto.getLoaiDiaChi());

        return diaChiRepository.save(diaChi);
    }

    @Override
    @Transactional
    public void deleteDiaChi(Long addressId) {
        DiaChi diaChi = diaChiRepository.findById(addressId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy địa chỉ!"));

        if (Boolean.TRUE.equals(diaChi.getMacDinh())) {
            List<DiaChi> existingAddresses = diaChiRepository.findByKhachHangId(diaChi.getKhachHang().getId());
            if (existingAddresses.size() > 1) {
                // Set another address as default before deleting
                for (DiaChi da : existingAddresses) {
                    if (!da.getId().equals(addressId)) {
                        da.setMacDinh(true);
                        diaChiRepository.save(da);
                        break;
                    }
                }
            } else {
                throw new RuntimeException("Không thể xóa địa chỉ duy nhất và mặc định của khách hàng!");
            }
        }

        diaChiRepository.delete(diaChi);
    }

    @Override
    @Transactional
    public DiaChi setDefaultDiaChi(Long addressId) {
        DiaChi diaChi = diaChiRepository.findById(addressId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy địa chỉ!"));

        if (Boolean.TRUE.equals(diaChi.getMacDinh())) {
            return diaChi; // Already default
        }

        List<DiaChi> existingAddresses = diaChiRepository.findByKhachHangId(diaChi.getKhachHang().getId());
        for (DiaChi da : existingAddresses) {
            if (Boolean.TRUE.equals(da.getMacDinh())) {
                da.setMacDinh(false);
                diaChiRepository.save(da);
            }
        }

        diaChi.setMacDinh(true);
        return diaChiRepository.save(diaChi);
    }
}
