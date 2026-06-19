package com.example.be.service.impl;

import com.example.be.dto.KhachHangVoucherDto;
import com.example.be.dto.PhieuGiamGiaDto;
import com.example.be.entity.KhachHang;
import com.example.be.entity.PhieuGiamGia;
import com.example.be.entity.PhieuGiamGiaKhachHang;
import com.example.be.repository.KhachHangRepository;
import com.example.be.repository.PhieuGiamGiaKhachHangRepository;
import com.example.be.repository.PhieuGiamGiaRepository;
import com.example.be.service.PhieuGiamGiaService;
import com.example.be.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class PhieuGiamGiaServiceImpl implements PhieuGiamGiaService {

    @Autowired
    private PhieuGiamGiaRepository phieuGiamGiaRepository;

    @Autowired
    private PhieuGiamGiaKhachHangRepository phieuGiamGiaKhachHangRepository;

    @Autowired
    private KhachHangRepository khachHangRepository;

    @Autowired
    private EmailService emailService;

    @Override
    public Page<PhieuGiamGia> searchVouchers(
            String search,
            String loaiGiamGia,
            String loaiPhieu,
            LocalDateTime start,
            LocalDateTime end,
            int page,
            int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        return phieuGiamGiaRepository.findAll(getSpecification(search, loaiGiamGia, loaiPhieu, start, end), pageable);
    }

    @Override
    public PhieuGiamGia findById(Long id) {
        return phieuGiamGiaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phiếu giảm giá với ID: " + id));
    }

    private String generateMaVoucher() {
        Optional<PhieuGiamGia> lastVoucher = phieuGiamGiaRepository.findFirstByMaVoucherStartingWithOrderByMaVoucherDesc("PGG");
        if (lastVoucher.isEmpty()) {
            return "PGG001";
        }
        String lastCode = lastVoucher.get().getMaVoucher();
        try {
            int num = Integer.parseInt(lastCode.substring(3));
            return String.format("PGG%03d", num + 1);
        } catch (NumberFormatException e) {
            return "PGG" + System.currentTimeMillis();
        }
    }

    @Override
    @Transactional
    public PhieuGiamGia createVoucher(PhieuGiamGiaDto dto) {
        String code = dto.getMaVoucher();
        if (code == null || code.trim().isEmpty()) {
            code = generateMaVoucher();
        } else {
            code = code.trim();
        }

        // Validate dates
        if (dto.getNgayBatDau() != null && dto.getNgayKetThuc() != null) {
            if (dto.getNgayBatDau().isAfter(dto.getNgayKetThuc())) {
                throw new RuntimeException("Ngày bắt đầu phải trước ngày kết thúc!");
            }
        }

        // Validate discount rules
        if ("Tiền mặt".equalsIgnoreCase(dto.getLoaiGiamGia())) {
            if (dto.getGiaTriGiam() != null && dto.getDonToiThieu() != null) {
                if (dto.getGiaTriGiam().compareTo(dto.getDonToiThieu()) > 0) {
                    throw new RuntimeException("Giá trị giảm không được lớn hơn hóa đơn tối thiểu!");
                }
            }
        } else if ("Phần trăm".equalsIgnoreCase(dto.getLoaiGiamGia())) {
            if (dto.getGiamToiDa() != null && dto.getDonToiThieu() != null) {
                if (dto.getGiamToiDa().compareTo(dto.getDonToiThieu()) > 0) {
                    throw new RuntimeException("Giảm tối đa không được lớn hơn hóa đơn tối thiểu!");
                }
            }
        }

        int quantity = dto.getSoLuong() != null ? dto.getSoLuong() : 0;
        if ("Cá nhân".equalsIgnoreCase(dto.getLoaiPhieu())) {
            quantity = dto.getCustomerIds() != null ? dto.getCustomerIds().size() : 0;
        }

        PhieuGiamGia voucher = PhieuGiamGia.builder()
                .maVoucher(code)
                .tenVoucher(dto.getTenVoucher() != null ? dto.getTenVoucher().trim() : "")
                .loaiGiamGia(dto.getLoaiGiamGia() != null ? dto.getLoaiGiamGia() : "Phần trăm")
                .giaTriGiam(dto.getGiaTriGiam())
                .donToiThieu(dto.getDonToiThieu())
                .giamToiDa(dto.getGiamToiDa())
                .soLuong(quantity)
                .soLuongDaDung(0)
                .loaiPhieu(dto.getLoaiPhieu() != null ? dto.getLoaiPhieu() : "Công khai")
                .ngayBatDau(dto.getNgayBatDau())
                .ngayKetThuc(dto.getNgayKetThuc())
                .ngayTao(LocalDateTime.now())
                .trangThai(dto.getTrangThai() != null ? dto.getTrangThai() : 1)
                .build();

        PhieuGiamGia savedVoucher = phieuGiamGiaRepository.save(voucher);

        // If it's targeted for individual customers, save mapping
        if ("Cá nhân".equalsIgnoreCase(savedVoucher.getLoaiPhieu()) && dto.getCustomerIds() != null) {
            for (Long customerId : dto.getCustomerIds()) {
                KhachHang customer = khachHangRepository.findById(customerId)
                        .orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng với ID: " + customerId));
                
                PhieuGiamGiaKhachHang mapping = PhieuGiamGiaKhachHang.builder()
                        .khachHang(customer)
                        .phieuGiamGia(savedVoucher)
                        .trangThai(1) // Active/Unused mapping
                        .build();
                phieuGiamGiaKhachHangRepository.save(mapping);
                
                // Gửi thông báo email cho khách hàng
                emailService.sendVoucherNotification(customer, savedVoucher);
            }
        }

        return savedVoucher;
    }

    @Override
    @Transactional
    public PhieuGiamGia updateVoucher(Long id, PhieuGiamGiaDto dto) {
        PhieuGiamGia voucher = findById(id);

        if (dto.getNgayBatDau() != null && dto.getNgayKetThuc() != null) {
            if (dto.getNgayBatDau().isAfter(dto.getNgayKetThuc())) {
                throw new RuntimeException("Ngày bắt đầu phải trước ngày kết thúc!");
            }
        }

        // Validate discount rules
        if ("Tiền mặt".equalsIgnoreCase(dto.getLoaiGiamGia())) {
            if (dto.getGiaTriGiam() != null && dto.getDonToiThieu() != null) {
                if (dto.getGiaTriGiam().compareTo(dto.getDonToiThieu()) > 0) {
                    throw new RuntimeException("Giá trị giảm không được lớn hơn hóa đơn tối thiểu!");
                }
            }
        } else if ("Phần trăm".equalsIgnoreCase(dto.getLoaiGiamGia())) {
            if (dto.getGiamToiDa() != null && dto.getDonToiThieu() != null) {
                if (dto.getGiamToiDa().compareTo(dto.getDonToiThieu()) > 0) {
                    throw new RuntimeException("Giảm tối đa không được lớn hơn hóa đơn tối thiểu!");
                }
            }
        }

        int quantity = dto.getSoLuong() != null ? dto.getSoLuong() : 0;
        if ("Cá nhân".equalsIgnoreCase(dto.getLoaiPhieu())) {
            quantity = dto.getCustomerIds() != null ? dto.getCustomerIds().size() : 0;
        }

        voucher.setTenVoucher(dto.getTenVoucher() != null ? dto.getTenVoucher().trim() : "");
        voucher.setLoaiGiamGia(dto.getLoaiGiamGia());
        voucher.setGiaTriGiam(dto.getGiaTriGiam());
        voucher.setDonToiThieu(dto.getDonToiThieu());
        voucher.setGiamToiDa(dto.getGiamToiDa());
        voucher.setSoLuong(quantity);
        voucher.setLoaiPhieu(dto.getLoaiPhieu());
        voucher.setNgayBatDau(dto.getNgayBatDau());
        voucher.setNgayKetThuc(dto.getNgayKetThuc());
        if (dto.getTrangThai() != null) {
            voucher.setTrangThai(dto.getTrangThai());
        }

        PhieuGiamGia updatedVoucher = phieuGiamGiaRepository.save(voucher);

        // Update customer mappings
        phieuGiamGiaKhachHangRepository.deleteByPhieuGiamGiaId(id);

        if ("Cá nhân".equalsIgnoreCase(updatedVoucher.getLoaiPhieu()) && dto.getCustomerIds() != null) {
            for (Long customerId : dto.getCustomerIds()) {
                KhachHang customer = khachHangRepository.findById(customerId)
                        .orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng với ID: " + customerId));

                PhieuGiamGiaKhachHang mapping = PhieuGiamGiaKhachHang.builder()
                        .khachHang(customer)
                        .phieuGiamGia(updatedVoucher)
                        .trangThai(1)
                        .build();
                phieuGiamGiaKhachHangRepository.save(mapping);

                // Gửi email thông báo cập nhật
                emailService.sendVoucherUpdateNotification(customer, updatedVoucher);
            }
        }

        return updatedVoucher;
    }

    @Override
    @Transactional
    public PhieuGiamGia toggleStatus(Long id, Integer status) {
        PhieuGiamGia voucher = findById(id);

        // Chặn mở lại nếu phiếu giảm giá đã hết hạn
        if (status == 1) {
            LocalDateTime now = LocalDateTime.now();
            if (voucher.getNgayKetThuc() != null && now.isAfter(voucher.getNgayKetThuc())) {
                throw new RuntimeException("Phiếu giảm giá đã hết hạn! Vui lòng chỉnh sửa lại ngày kết thúc để mở lại.");
            }
        }

        voucher.setTrangThai(status);
        PhieuGiamGia savedVoucher = phieuGiamGiaRepository.save(voucher);

        // Gửi thông báo email nếu ngừng hoạt động phiếu cá nhân
        if (status == 0 && "Cá nhân".equalsIgnoreCase(savedVoucher.getLoaiPhieu())) {
            List<PhieuGiamGiaKhachHang> mappings = phieuGiamGiaKhachHangRepository.findByPhieuGiamGiaId(id);
            for (PhieuGiamGiaKhachHang mapping : mappings) {
                emailService.sendVoucherCancelNotification(mapping.getKhachHang(), savedVoucher);
            }
        }

        return savedVoucher;
    }

    @Override
    public Page<KhachHangVoucherDto> getCustomerStatistics(
            String search,
            Integer orderMonth,
            Integer orderYear,
            int page,
            int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        String searchStr = (search == null || search.trim().isEmpty()) ? null : search.trim();
        return khachHangRepository.getCustomerStatisticsForVoucher(searchStr, orderMonth, orderYear, pageable);
    }

    @Override
    public List<Long> getCustomerIdsByVoucherId(Long voucherId) {
        return phieuGiamGiaKhachHangRepository.findByPhieuGiamGiaId(voucherId)
                .stream()
                .map(mapping -> mapping.getKhachHang().getId())
                .collect(Collectors.toList());
    }

    @Override
    public byte[] exportExcel(
            String search,
            String loaiGiamGia,
            String loaiPhieu,
            LocalDateTime start,
            LocalDateTime end
    ) throws IOException {
        List<PhieuGiamGia> list = phieuGiamGiaRepository.findAll(getSpecification(search, loaiGiamGia, loaiPhieu, start, end), Sort.by(Sort.Direction.DESC, "id"));

        try (org.apache.poi.ss.usermodel.Workbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Danh sách Phiếu giảm giá");

            // Header Style
            org.apache.poi.ss.usermodel.CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);

            // Columns headers
            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);
            String[] headers = {
                    "STT", "Mã", "Tên", "Loại", "Đối tượng", 
                    "Số lượng", "Đã dùng", "Giá trị giảm", 
                    "Tối đa", "Đơn tối thiểu", "Ngày bắt đầu", 
                    "Ngày kết thúc", "Trạng thái"
            };
            for (int i = 0; i < headers.length; i++) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");

            // Add rows
            int rowIdx = 1;
            for (PhieuGiamGia pgg : list) {
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIdx);
                row.createCell(0).setCellValue(rowIdx);
                row.createCell(1).setCellValue(pgg.getMaVoucher() != null ? pgg.getMaVoucher() : "");
                row.createCell(2).setCellValue(pgg.getTenVoucher() != null ? pgg.getTenVoucher() : "");
                row.createCell(3).setCellValue(pgg.getLoaiGiamGia() != null ? pgg.getLoaiGiamGia() : "");
                row.createCell(4).setCellValue(pgg.getLoaiPhieu() != null ? pgg.getLoaiPhieu() : "");
                row.createCell(5).setCellValue(pgg.getSoLuong() != null ? pgg.getSoLuong() : 0);
                row.createCell(6).setCellValue(pgg.getSoLuongDaDung() != null ? pgg.getSoLuongDaDung() : 0);
                row.createCell(7).setCellValue(pgg.getGiaTriGiam() != null ? pgg.getGiaTriGiam().doubleValue() : 0);
                row.createCell(8).setCellValue(pgg.getGiamToiDa() != null ? pgg.getGiamToiDa().doubleValue() : 0);
                row.createCell(9).setCellValue(pgg.getDonToiThieu() != null ? pgg.getDonToiThieu().doubleValue() : 0);
                row.createCell(10).setCellValue(pgg.getNgayBatDau() != null ? pgg.getNgayBatDau().format(formatter) : "");
                row.createCell(11).setCellValue(pgg.getNgayKetThuc() != null ? pgg.getNgayKetThuc().format(formatter) : "");
                
                String statusLabel = "Ngừng áp dụng";
                if (pgg.getTrangThai() == 1) {
                    LocalDateTime now = LocalDateTime.now();
                    if (pgg.getNgayBatDau() != null && now.isBefore(pgg.getNgayBatDau())) {
                        statusLabel = "Đang chờ";
                    } else if (pgg.getNgayKetThuc() != null && now.isAfter(pgg.getNgayKetThuc())) {
                        statusLabel = "Hết hạn";
                    } else {
                        statusLabel = "Đang áp dụng";
                    }
                }
                row.createCell(12).setCellValue(statusLabel);
                rowIdx++;
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    private Specification<PhieuGiamGia> getSpecification(
            String search,
            String loaiGiamGia,
            String loaiPhieu,
            LocalDateTime start,
            LocalDateTime end
    ) {
        return (root, query, criteriaBuilder) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();

            if (search != null && !search.trim().isEmpty()) {
                String searchTrim = "%" + search.trim().toLowerCase() + "%";
                predicates.add(criteriaBuilder.or(
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("maVoucher")), searchTrim),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("tenVoucher")), searchTrim)
                ));
            }

            if (loaiGiamGia != null && !loaiGiamGia.trim().isEmpty()) {
                predicates.add(criteriaBuilder.equal(root.get("loaiGiamGia"), loaiGiamGia.trim()));
            }

            if (loaiPhieu != null && !loaiPhieu.trim().isEmpty()) {
                predicates.add(criteriaBuilder.equal(root.get("loaiPhieu"), loaiPhieu.trim()));
            }

            if (start != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("ngayBatDau"), start));
            }

            if (end != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("ngayKetThuc"), end));
            }

            return criteriaBuilder.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
    }
}
