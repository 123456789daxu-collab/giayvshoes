package com.example.be.service.impl;

import com.example.be.entity.KhachHang;
import com.example.be.entity.DiaChi;
import com.example.be.dto.KhachHangDto;
import com.example.be.dto.DiaChiDto;
import com.example.be.repository.KhachHangRepository;
import com.example.be.repository.DiaChiRepository;
import com.example.be.repository.HoaDonRepository;
import com.example.be.repository.PhieuGiamGiaKhachHangRepository;
import com.example.be.entity.HoaDon;
import com.example.be.entity.PhieuGiamGiaKhachHang;
import com.example.be.service.KhachHangService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class KhachHangServiceImpl implements KhachHangService {

    @Autowired
    private KhachHangRepository khachHangRepository;

    @Autowired
    private DiaChiRepository diaChiRepository;

    @Autowired
    private HoaDonRepository hoaDonRepository;

    @Autowired
    private PhieuGiamGiaKhachHangRepository phieuGiamGiaKhachHangRepository;

    @Override
    public Page<KhachHang> searchKhachHang(String search, Boolean gioiTinh, LocalDate dob, Integer trangThai, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        return khachHangRepository.findAll(getSpecification(search, gioiTinh, dob, trangThai), pageable);
    }

    @Override
    public List<KhachHang> getFilteredList(String search, Boolean gioiTinh, LocalDate dob, Integer trangThai) {
        return khachHangRepository.findAll(getSpecification(search, gioiTinh, dob, trangThai), Sort.by(Sort.Direction.DESC, "id"));
    }

    @Override
    public KhachHang findById(Long id) {
        return khachHangRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng với ID: " + id));
    }

    private String generateMaKhachHang() {
        Optional<KhachHang> lastCustomer = khachHangRepository.findFirstByMaKhachHangStartingWithOrderByMaKhachHangDesc("KH");
        if (lastCustomer.isEmpty()) {
            return "KH00001";
        }
        String lastCode = lastCustomer.get().getMaKhachHang();
        try {
            int num = Integer.parseInt(lastCode.substring(2));
            return String.format("KH%05d", num + 1);
        } catch (NumberFormatException e) {
            return "KH" + System.currentTimeMillis();
        }
    }

    @Override
    @Transactional
    public KhachHang createKhachHang(KhachHangDto dto) {
        if (dto.getSoDienThoai() != null && !dto.getSoDienThoai().trim().isEmpty() && khachHangRepository.existsBySoDienThoai(dto.getSoDienThoai())) {
            throw new RuntimeException("Số điện thoại đã tồn tại trong hệ thống!");
        }
        if (dto.getEmail() != null && !dto.getEmail().trim().isEmpty() && khachHangRepository.existsByEmail(dto.getEmail())) {
            throw new RuntimeException("Email đã tồn tại trong hệ thống!");
        }

        KhachHang khachHang = KhachHang.builder()
                .maKhachHang(generateMaKhachHang())
                .hoTen(dto.getHoTen())
                .email(dto.getEmail())
                .soDienThoai(dto.getSoDienThoai())
                .matKhau("123456") // Mật khẩu mặc định
                .ngaySinh(dto.getNgaySinh())
                .gioiTinh(dto.getGioiTinh())
                .anhDaiDien(dto.getAnhDaiDien())
                .ngayTao(LocalDateTime.now())
                .trangThai(dto.getTrangThai() != null ? dto.getTrangThai() : 1)
                .build();

        KhachHang savedCustomer = khachHangRepository.save(khachHang);

        // Lưu địa chỉ mặc định kèm theo (nếu có)
        if (dto.getDiaChiMacDinh() != null) {
            DiaChiDto dcDto = dto.getDiaChiMacDinh();
            if (dcDto.getTinhThanh() != null && !dcDto.getTinhThanh().trim().isEmpty()) {
                DiaChi diaChi = DiaChi.builder()
                        .khachHang(savedCustomer)
                        .tenNguoiNhan(dcDto.getTenNguoiNhan() != null && !dcDto.getTenNguoiNhan().trim().isEmpty() ? dcDto.getTenNguoiNhan() : savedCustomer.getHoTen())
                        .sdt(dcDto.getSdt() != null && !dcDto.getSdt().trim().isEmpty() ? dcDto.getSdt() : savedCustomer.getSoDienThoai())
                        .tinhThanh(dcDto.getTinhThanh())
                        .quanHuyen(dcDto.getQuanHuyen())
                        .phuongXa(dcDto.getPhuongXa())
                        .diaChiChiTiet(dcDto.getDiaChiChiTiet())
                        .loaiDiaChi(dcDto.getLoaiDiaChi() != null ? dcDto.getLoaiDiaChi() : "Nhà riêng")
                        .macDinh(true)
                        .ngayTao(LocalDateTime.now())
                        .build();
                diaChiRepository.save(diaChi);
            }
        }

        return savedCustomer;
    }

    @Override
    @Transactional
    public KhachHang updateKhachHang(Long id, KhachHangDto dto) {
        KhachHang khachHang = findById(id);

        if (dto.getSoDienThoai() != null && !dto.getSoDienThoai().trim().isEmpty() 
                && !dto.getSoDienThoai().equals(khachHang.getSoDienThoai()) 
                && khachHangRepository.existsBySoDienThoai(dto.getSoDienThoai())) {
            throw new RuntimeException("Số điện thoại đã tồn tại!");
        }
        if (dto.getEmail() != null && !dto.getEmail().trim().isEmpty() 
                && !dto.getEmail().equals(khachHang.getEmail()) 
                && khachHangRepository.existsByEmail(dto.getEmail())) {
            throw new RuntimeException("Email đã tồn tại!");
        }

        khachHang.setHoTen(dto.getHoTen());
        khachHang.setEmail(dto.getEmail());
        khachHang.setSoDienThoai(dto.getSoDienThoai());
        khachHang.setNgaySinh(dto.getNgaySinh());
        khachHang.setGioiTinh(dto.getGioiTinh());
        khachHang.setAnhDaiDien(dto.getAnhDaiDien());
        if (dto.getTrangThai() != null) {
            khachHang.setTrangThai(dto.getTrangThai());
        }

        return khachHangRepository.save(khachHang);
    }

    @Override
    @Transactional
    public KhachHang toggleStatus(Long id, Integer status) {
        KhachHang khachHang = findById(id);
        khachHang.setTrangThai(status);
        return khachHangRepository.save(khachHang);
    }

    @Override
    @Transactional
    public void deleteKhachHang(Long id) {
        KhachHang khachHang = findById(id);
        khachHang.setTrangThai(0);
        khachHangRepository.save(khachHang);
    }

    @Override
    public void updateAvatar(Long id, String avatarPath) {
        KhachHang khachHang = findById(id);
        khachHang.setAnhDaiDien(avatarPath);
        khachHangRepository.save(khachHang);
    }

    @Override
    public byte[] exportExcel(String search, Boolean gioiTinh, LocalDate dob, Integer trangThai) throws IOException {
        List<KhachHang> customers = getFilteredList(search, gioiTinh, dob, trangThai);

        try (org.apache.poi.ss.usermodel.Workbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Danh sách Khách hàng");

            // Header row style
            org.apache.poi.ss.usermodel.CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);

            // Create headers
            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);
            String[] headers = {"STT", "Mã khách hàng", "Họ và tên", "Giới tính", "Ngày sinh", "Số điện thoại", "Email", "Trạng thái"};
            for (int i = 0; i < headers.length; i++) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Create data rows
            int rowIdx = 1;
            for (KhachHang kh : customers) {
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIdx);
                row.createCell(0).setCellValue(rowIdx);
                row.createCell(1).setCellValue(kh.getMaKhachHang() != null ? kh.getMaKhachHang() : "");
                row.createCell(2).setCellValue(kh.getHoTen() != null ? kh.getHoTen() : "");
                row.createCell(3).setCellValue(kh.getGioiTinh() == null ? "" : (kh.getGioiTinh() ? "Nam" : "Nữ"));
                row.createCell(4).setCellValue(kh.getNgaySinh() == null ? "" : kh.getNgaySinh().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
                row.createCell(5).setCellValue(kh.getSoDienThoai() != null ? kh.getSoDienThoai() : "");
                row.createCell(6).setCellValue(kh.getEmail() != null ? kh.getEmail() : "");
                row.createCell(7).setCellValue(kh.getTrangThai() == null ? "" : (kh.getTrangThai() == 1 ? "Hoạt động" : "Ngừng hoạt động"));
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

    @Override
    @Transactional
    public void importExcel(MultipartFile file) throws Exception {
        try (org.apache.poi.ss.usermodel.Workbook workbook = org.apache.poi.ss.usermodel.WorkbookFactory.create(file.getInputStream())) {
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.getSheetAt(0);

            for (int r = 1; r <= sheet.getLastRowNum(); r++) {
                org.apache.poi.ss.usermodel.Row row = sheet.getRow(r);
                if (row == null) continue;

                String hoTen = getCellValueAsString(row.getCell(1));
                if (hoTen == null || hoTen.trim().isEmpty()) continue;

                String sdt = getCellValueAsString(row.getCell(2));
                if (sdt == null || sdt.trim().isEmpty()) continue;

                if (khachHangRepository.existsBySoDienThoai(sdt)) {
                    continue; // Skip existing phone number
                }

                String email = getCellValueAsString(row.getCell(3));
                if (email != null && !email.trim().isEmpty() && khachHangRepository.existsByEmail(email)) {
                    email = null; // Skip email if duplicates found to avoid constraint issues
                }

                String gtStr = getCellValueAsString(row.getCell(4));
                Boolean gioiTinh = true;
                if (gtStr != null && (gtStr.equalsIgnoreCase("nữ") || gtStr.equalsIgnoreCase("nu"))) {
                    gioiTinh = false;
                }

                String nsStr = getCellValueAsString(row.getCell(5));
                LocalDate ngaySinh = null;
                if (nsStr != null && !nsStr.trim().isEmpty()) {
                    try {
                        ngaySinh = LocalDate.parse(nsStr.trim(), DateTimeFormatter.ofPattern("dd/MM/yyyy"));
                    } catch (Exception e) {
                        try {
                            ngaySinh = LocalDate.parse(nsStr.trim(), DateTimeFormatter.ofPattern("yyyy-MM-dd"));
                        } catch (Exception ex) {
                            // Ignored formatting errors
                        }
                    }
                }

                String ttStr = getCellValueAsString(row.getCell(6));
                Integer trangThai = 1;
                if (ttStr != null && (ttStr.equalsIgnoreCase("ngừng hoạt động") || ttStr.equalsIgnoreCase("ngung hoat dong") || ttStr.equalsIgnoreCase("0"))) {
                    trangThai = 0;
                }

                KhachHang khachHang = KhachHang.builder()
                        .maKhachHang(generateMaKhachHang())
                        .hoTen(hoTen)
                        .soDienThoai(sdt)
                        .email(email)
                        .matKhau("123456")
                        .gioiTinh(gioiTinh)
                        .ngaySinh(ngaySinh)
                        .ngayTao(LocalDateTime.now())
                        .trangThai(trangThai)
                        .build();

                khachHangRepository.save(khachHang);
            }
        }
    }

    @Override
    public byte[] downloadTemplate() throws IOException {
        try (org.apache.poi.ss.usermodel.Workbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Template Nhập Khách hàng");

            org.apache.poi.ss.usermodel.CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.LIGHT_GREEN.getIndex());
            headerStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);

            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);
            String[] headers = {"STT", "Họ và tên (*)", "Số điện thoại (*)", "Email", "Giới tính (Nam/Nữ)", "Ngày sinh (dd/MM/yyyy)", "Trạng thái (Hoạt động/Ngừng hoạt động)"};
            for (int i = 0; i < headers.length; i++) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            org.apache.poi.ss.usermodel.Row row = sheet.createRow(1);
            row.createCell(0).setCellValue(1);
            row.createCell(1).setCellValue("Nguyễn Văn A");
            row.createCell(2).setCellValue("0987654321");
            row.createCell(3).setCellValue("vana@gmail.com");
            row.createCell(4).setCellValue("Nam");
            row.createCell(5).setCellValue("15/08/1995");
            row.createCell(6).setCellValue("Hoạt động");

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    private String getCellValueAsString(org.apache.poi.ss.usermodel.Cell cell) {
        if (cell == null) return null;
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue();
            case NUMERIC:
                if (org.apache.poi.ss.usermodel.DateUtil.isCellDateFormatted(cell)) {
                    java.util.Date date = cell.getDateCellValue();
                    return new java.text.SimpleDateFormat("dd/MM/yyyy").format(date);
                }
                return new java.text.DecimalFormat("#").format(cell.getNumericCellValue());
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            default:
                return null;
        }
    }

    private Specification<KhachHang> getSpecification(String search, Boolean gioiTinh, LocalDate dob, Integer trangThai) {
        return (root, query, criteriaBuilder) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();

            if (search != null && !search.trim().isEmpty()) {
                String searchTrim = "%" + search.trim().toLowerCase() + "%";
                predicates.add(criteriaBuilder.or(
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("hoTen")), searchTrim),
                        criteriaBuilder.like(root.get("soDienThoai"), searchTrim),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("email")), searchTrim)
                ));
            }

            if (gioiTinh != null) {
                predicates.add(criteriaBuilder.equal(root.get("gioiTinh"), gioiTinh));
            }

            if (dob != null) {
                predicates.add(criteriaBuilder.equal(root.get("ngaySinh"), dob));
            }

            if (trangThai != null) {
                predicates.add(criteriaBuilder.equal(root.get("trangThai"), trangThai));
            }

            return criteriaBuilder.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
    }
}
