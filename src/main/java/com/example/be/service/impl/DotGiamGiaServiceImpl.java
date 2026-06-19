package com.example.be.service.impl;

import com.example.be.dto.DotGiamGiaDto;
import com.example.be.dto.SanPhamChiTietGiamGiaDto;
import com.example.be.entity.DotGiamGia;
import com.example.be.entity.ChiTietDotGiamGia;
import com.example.be.entity.SanPhamChiTiet;
import com.example.be.entity.SanPham;
import com.example.be.repository.DotGiamGiaRepository;
import com.example.be.repository.ChiTietDotGiamGiaRepository;
import com.example.be.repository.SanPhamChiTietRepository;
import com.example.be.repository.SanPhamRepository;
import com.example.be.service.DotGiamGiaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class DotGiamGiaServiceImpl implements DotGiamGiaService {

    @Autowired
    private DotGiamGiaRepository dotGiamGiaRepository;

    @Autowired
    private ChiTietDotGiamGiaRepository chiTietDotGiamGiaRepository;

    @Autowired
    private SanPhamChiTietRepository sanPhamChiTietRepository;

    @Autowired
    private SanPhamRepository sanPhamRepository;

    @Override
    public Page<DotGiamGia> searchCampaigns(
            String search,
            LocalDateTime start,
            LocalDateTime end,
            Integer trangThai,
            String hinhThucGiam,
            java.math.BigDecimal giaTriGiam,
            int page,
            int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        return dotGiamGiaRepository.findAll(getSpecification(search, start, end, trangThai, hinhThucGiam, giaTriGiam), pageable);
    }

    @Override
    public DotGiamGia findById(Long id) {
        return dotGiamGiaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đợt giảm giá với ID: " + id));
    }

    @Override
    public String getNextMaCampaign() {
        Optional<DotGiamGia> lastCampaign = dotGiamGiaRepository.findFirstByMaDotGiamGiaStartingWithOrderByMaDotGiamGiaDesc("DGG");
        if (lastCampaign.isEmpty()) {
            return "DGG001";
        }
        String lastCode = lastCampaign.get().getMaDotGiamGia();
        try {
            int num = Integer.parseInt(lastCode.substring(3));
            return String.format("DGG%03d", num + 1);
        } catch (NumberFormatException e) {
            return "DGG" + System.currentTimeMillis();
        }
    }

    @Override
    @Transactional
    public DotGiamGia createCampaign(DotGiamGiaDto dto) {
        String code = dto.getMaDotGiamGia();
        if (code == null || code.trim().isEmpty()) {
            code = getNextMaCampaign();
        } else {
            code = code.trim();
        }

        // Validate dates
        if (dto.getNgayBatDau() != null && dto.getNgayKetThuc() != null) {
            if (dto.getNgayBatDau().isAfter(dto.getNgayKetThuc())) {
                throw new RuntimeException("Ngày bắt đầu phải trước ngày kết thúc!");
            }
        }

        // Validate gia tri giam
        if (dto.getGiaTriGiam() == null || dto.getGiaTriGiam().compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Giá trị giảm phải lớn hơn 0!");
        }
        
        String hinhThuc = dto.getHinhThucGiam() != null ? dto.getHinhThucGiam() : "%";

        if ("%".equals(hinhThuc)) {
            if (dto.getGiaTriGiam().intValue() < 1 || dto.getGiaTriGiam().intValue() > 100) {
                throw new RuntimeException("Phần trăm giảm phải từ 1% đến 100%!");
            }
        }

        DotGiamGia campaign = DotGiamGia.builder()
                .maDotGiamGia(code)
                .tenDotGiamGia(dto.getTenDotGiamGia() != null ? dto.getTenDotGiamGia().trim() : "")
                .hinhThucGiam("%")
                .giaTriGiam(dto.getGiaTriGiam())
                .phanTramGiam(dto.getGiaTriGiam().intValue())
                .ngayBatDau(dto.getNgayBatDau())
                .ngayKetThuc(dto.getNgayKetThuc())
                .moTa(dto.getMoTa() != null ? dto.getMoTa().trim() : "")
                .trangThai(dto.getTrangThai() != null ? dto.getTrangThai() : 1)
                .build();

        DotGiamGia savedCampaign = dotGiamGiaRepository.save(campaign);

        // Save product mappings
        if (dto.getProductDetailIds() != null) {
            for (Long productDetailId : dto.getProductDetailIds()) {
                SanPhamChiTiet spct = sanPhamChiTietRepository.findById(productDetailId)
                        .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm chi tiết với ID: " + productDetailId));

                ChiTietDotGiamGia mapping = ChiTietDotGiamGia.builder()
                        .dotGiamGia(savedCampaign)
                        .sanPhamChiTiet(spct)
                        .trangThai(1)
                        .ngayTao(LocalDateTime.now())
                        .build();
                chiTietDotGiamGiaRepository.save(mapping);
            }
        }

        return savedCampaign;
    }

    @Override
    @Transactional
    public DotGiamGia updateCampaign(Long id, DotGiamGiaDto dto) {
        DotGiamGia campaign = findById(id);

        // Validate dates
        if (dto.getNgayBatDau() != null && dto.getNgayKetThuc() != null) {
            if (dto.getNgayBatDau().isAfter(dto.getNgayKetThuc())) {
                throw new RuntimeException("Ngày bắt đầu phải trước ngày kết thúc!");
            }
        }

        // Validate gia tri giam
        if (dto.getGiaTriGiam() == null || dto.getGiaTriGiam().compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Giá trị giảm phải lớn hơn 0!");
        }

        String hinhThuc = dto.getHinhThucGiam() != null ? dto.getHinhThucGiam() : "%";

        if ("%".equals(hinhThuc)) {
            if (dto.getGiaTriGiam().intValue() < 1 || dto.getGiaTriGiam().intValue() > 100) {
                throw new RuntimeException("Phần trăm giảm phải từ 1% đến 100%!");
            }
        }

        campaign.setTenDotGiamGia(dto.getTenDotGiamGia() != null ? dto.getTenDotGiamGia().trim() : "");
        campaign.setHinhThucGiam("%");
        campaign.setGiaTriGiam(dto.getGiaTriGiam());
        campaign.setPhanTramGiam(dto.getGiaTriGiam().intValue());
        campaign.setNgayBatDau(dto.getNgayBatDau());
        campaign.setNgayKetThuc(dto.getNgayKetThuc());
        campaign.setMoTa(dto.getMoTa() != null ? dto.getMoTa().trim() : "");
        if (dto.getTrangThai() != null) {
            campaign.setTrangThai(dto.getTrangThai());
        }

        DotGiamGia updatedCampaign = dotGiamGiaRepository.save(campaign);

        // Delete old mappings and save new ones
        chiTietDotGiamGiaRepository.deleteByDotGiamGiaId(id);

        if (dto.getProductDetailIds() != null) {
            for (Long productDetailId : dto.getProductDetailIds()) {
                SanPhamChiTiet spct = sanPhamChiTietRepository.findById(productDetailId)
                        .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm chi tiết với ID: " + productDetailId));

                ChiTietDotGiamGia mapping = ChiTietDotGiamGia.builder()
                        .dotGiamGia(updatedCampaign)
                        .sanPhamChiTiet(spct)
                        .trangThai(1)
                        .ngayTao(LocalDateTime.now())
                        .build();
                chiTietDotGiamGiaRepository.save(mapping);
            }
        }

        return updatedCampaign;
    }

    @Override
    @Transactional
    public DotGiamGia toggleStatus(Long id, Integer status) {
        DotGiamGia campaign = findById(id);

        // Block reopening if expired
        if (status == 1) {
            LocalDateTime now = LocalDateTime.now();
            if (campaign.getNgayKetThuc() != null && now.isAfter(campaign.getNgayKetThuc())) {
                throw new RuntimeException("Đợt giảm giá đã hết hạn! Vui lòng cập nhật lại ngày kết thúc trước.");
            }
        }

        campaign.setTrangThai(status);
        return dotGiamGiaRepository.save(campaign);
    }

    @Override
    @Transactional
    public void deleteCampaign(Long id) {
        DotGiamGia campaign = findById(id);
        campaign.setTrangThai(0);
        dotGiamGiaRepository.save(campaign);
    }

    @Override
    public List<Long> getProductDetailIdsByCampaignId(Long campaignId) {
        return chiTietDotGiamGiaRepository.findByDotGiamGiaId(campaignId)
                .stream()
                .map(mapping -> mapping.getSanPhamChiTiet().getId())
                .collect(Collectors.toList());
    }

    @Override
    public Page<SanPhamChiTietGiamGiaDto> getProductDetails(String search, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        Specification<SanPhamChiTiet> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            // Only active products
            predicates.add(cb.equal(root.get("trangThai"), 1));

            if (search != null && !search.trim().isEmpty()) {
                String searchTrim = "%" + search.trim().toLowerCase() + "%";
                Join<SanPhamChiTiet, SanPham> sanPhamJoin = root.join("sanPham", JoinType.LEFT);
                Join<SanPhamChiTiet, com.example.be.entity.MauSac> mauSacJoin = root.join("mauSac", JoinType.LEFT);
                Join<SanPhamChiTiet, com.example.be.entity.CoGiay> coGiayJoin = root.join("coGiay", JoinType.LEFT);
                
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("ma")), searchTrim),
                        cb.like(cb.lower(sanPhamJoin.get("tenSanPham")), searchTrim),
                        cb.like(cb.lower(mauSacJoin.get("tenMauSac")), searchTrim),
                        cb.like(coGiayJoin.get("sizeGiay").as(String.class), searchTrim)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return sanPhamChiTietRepository.findAll(spec, pageable).map(spct -> 
            SanPhamChiTietGiamGiaDto.builder()
                    .id(spct.getId())
                    .maSanPham(spct.getMa())
                    .tenSanPham(spct.getSanPham() != null ? spct.getSanPham().getTenSanPham() : "")
                    .tenMauSac(spct.getMauSac() != null ? spct.getMauSac().getTenMauSac() : "")
                    .tenKichCo(spct.getCoGiay() != null ? String.valueOf(spct.getCoGiay().getSizeGiay()) : "")
                    .giaBan(spct.getGiaBan())
                    .soLuongTon(spct.getSoLuongTon() != null ? spct.getSoLuongTon() : 0)
                    .build()
        );
    }

    @Override
    public byte[] exportExcel(
            String search,
            LocalDateTime start,
            LocalDateTime end,
            Integer trangThai,
            String hinhThucGiam,
            java.math.BigDecimal giaTriGiam
    ) throws Exception {
        List<DotGiamGia> list = dotGiamGiaRepository.findAll(getSpecification(search, start, end, trangThai, hinhThucGiam, giaTriGiam), Sort.by(Sort.Direction.DESC, "id"));

        try (org.apache.poi.ss.usermodel.Workbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Danh sách Đợt giảm giá");

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
                    "STT", "Mã Đợt giảm giá", "Tên Đợt giảm giá", "Giá trị giảm", "Hình thức giảm",
                    "Ngày bắt đầu", "Ngày kết thúc", "Trạng thái", "Mô tả"
            };
            for (int i = 0; i < headers.length; i++) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");

            // Add rows
            int rowIdx = 1;
            for (DotGiamGia dgg : list) {
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIdx);
                row.createCell(0).setCellValue(rowIdx);
                row.createCell(1).setCellValue(dgg.getMaDotGiamGia() != null ? dgg.getMaDotGiamGia() : "");
                row.createCell(2).setCellValue(dgg.getTenDotGiamGia() != null ? dgg.getTenDotGiamGia() : "");
                row.createCell(3).setCellValue(dgg.getGiaTriGiam() != null ? dgg.getGiaTriGiam().toString() : "");
                row.createCell(4).setCellValue(dgg.getHinhThucGiam() != null ? dgg.getHinhThucGiam() : "");
                row.createCell(5).setCellValue(dgg.getNgayBatDau() != null ? dgg.getNgayBatDau().format(formatter) : "");
                row.createCell(6).setCellValue(dgg.getNgayKetThuc() != null ? dgg.getNgayKetThuc().format(formatter) : "");

                String statusLabel = "Ngừng hoạt động";
                if (dgg.getTrangThai() == 1) {
                    LocalDateTime now = LocalDateTime.now();
                    if (dgg.getNgayBatDau() != null && now.isBefore(dgg.getNgayBatDau())) {
                        statusLabel = "Chưa diễn ra";
                    } else if (dgg.getNgayKetThuc() != null && now.isAfter(dgg.getNgayKetThuc())) {
                        statusLabel = "Hết hạn";
                    } else {
                        statusLabel = "Kích hoạt";
                    }
                }
                row.createCell(7).setCellValue(statusLabel);
                row.createCell(8).setCellValue(dgg.getMoTa() != null ? dgg.getMoTa() : "");
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

    private Specification<DotGiamGia> getSpecification(
            String search,
            LocalDateTime start,
            LocalDateTime end,
            Integer trangThai,
            String hinhThucGiam,
            java.math.BigDecimal giaTriGiam
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (search != null && !search.trim().isEmpty()) {
                String searchTrim = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("maDotGiamGia")), searchTrim),
                        cb.like(cb.lower(root.get("tenDotGiamGia")), searchTrim)
                ));
            }

            if (start != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("ngayBatDau"), start));
            }

            if (end != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("ngayKetThuc"), end));
            }

            if (trangThai != null) {
                // If filtering by real status
                LocalDateTime now = LocalDateTime.now();
                if (trangThai == 1) { // Kích hoạt (Active and current)
                    predicates.add(cb.equal(root.get("trangThai"), 1));
                    predicates.add(cb.lessThanOrEqualTo(root.get("ngayBatDau"), now));
                    predicates.add(cb.greaterThanOrEqualTo(root.get("ngayKetThuc"), now));
                } else if (trangThai == 2) { // Hết hạn (Expired or inactive)
                    predicates.add(cb.or(
                            cb.equal(root.get("trangThai"), 0),
                            cb.lessThan(root.get("ngayKetThuc"), now)
                    ));
                } else if (trangThai == 3) { // Chưa diễn ra (Pending)
                    predicates.add(cb.equal(root.get("trangThai"), 1));
                    predicates.add(cb.greaterThan(root.get("ngayBatDau"), now));
                } else if (trangThai == 0) { // Tắt/Ngừng hoạt động
                    predicates.add(cb.equal(root.get("trangThai"), 0));
                }
            }

            if (hinhThucGiam != null && !hinhThucGiam.trim().isEmpty()) {
                predicates.add(cb.equal(root.get("hinhThucGiam"), hinhThucGiam.trim()));
            }

            if (giaTriGiam != null) {
                predicates.add(cb.equal(root.get("giaTriGiam"), giaTriGiam));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
