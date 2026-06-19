package com.example.be.service;

import com.example.be.dto.HoaDonDTO;
import com.example.be.entity.ChiTietHoaDon;
import com.example.be.entity.HoaDon;
import com.example.be.entity.SanPhamChiTiet;
import com.example.be.repository.ChiTietHoaDonRepository;
import com.example.be.repository.HoaDonRepository;
import com.example.be.entity.LichSuHoaDon;
import com.example.be.repository.LichSuHoaDonRepository;
import com.example.be.repository.SanPhamChiTietRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class HoaDonService {

    private final HoaDonRepository hoaDonRepository;
    private final ChiTietHoaDonRepository chiTietHoaDonRepository;
    private final SanPhamChiTietRepository sanPhamChiTietRepository;
    private final LichSuHoaDonRepository lichSuHoaDonRepository;

    public HoaDonService(HoaDonRepository hoaDonRepository,
            ChiTietHoaDonRepository chiTietHoaDonRepository,
            SanPhamChiTietRepository sanPhamChiTietRepository,
            LichSuHoaDonRepository lichSuHoaDonRepository) {
        this.hoaDonRepository = hoaDonRepository;
        this.chiTietHoaDonRepository = chiTietHoaDonRepository;
        this.sanPhamChiTietRepository = sanPhamChiTietRepository;
        this.lichSuHoaDonRepository = lichSuHoaDonRepository;
    }

<<<<<<< HEAD
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<HoaDonDTO> search(String keyword, Integer trangThai, String loaiHoaDon,
            BigDecimal minPrice, BigDecimal maxPrice,
            LocalDateTime startDate, LocalDateTime endDate) {
        String loaiHoaDonDb = null;
        if (loaiHoaDon != null && !loaiHoaDon.isEmpty()) {
            if ("Tại quầy".equalsIgnoreCase(loaiHoaDon) || "Tai quay".equalsIgnoreCase(loaiHoaDon)) {
                loaiHoaDonDb = "Tại quầy";
            } else if ("Online".equalsIgnoreCase(loaiHoaDon)) {
                loaiHoaDonDb = "Online";
            } else {
                loaiHoaDonDb = loaiHoaDon;
            }
        }

        List<HoaDon> hoaDons = hoaDonRepository.searchHoaDon(
                keyword, trangThai, loaiHoaDonDb, minPrice, maxPrice, startDate, endDate);

=======
    public List<HoaDonDTO> search(String keyword, Integer trangThai, String loaiHoaDon, 
                                  BigDecimal minPrice, BigDecimal maxPrice, 
                                  LocalDateTime startDate, LocalDateTime endDate) {
        Boolean loaiHoaDonBool = null;
        if ("Tại quầy".equalsIgnoreCase(loaiHoaDon) || "Tai quay".equalsIgnoreCase(loaiHoaDon)) {
            loaiHoaDonBool = false;
        } else if ("Online".equalsIgnoreCase(loaiHoaDon) || "Trực tuyến".equalsIgnoreCase(loaiHoaDon)) {
            loaiHoaDonBool = true;
        }

        List<HoaDon> hoaDons = hoaDonRepository.searchHoaDon(
                keyword, trangThai, loaiHoaDonBool, minPrice, maxPrice, startDate, endDate);
                
>>>>>>> origin/feature-lehung
        return hoaDons.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    public byte[] exportInvoicesToExcel(String keyword, Integer trangThai, String loaiHoaDon,
            BigDecimal minPrice, BigDecimal maxPrice,
            LocalDateTime startDate, LocalDateTime endDate) throws java.io.IOException {
        List<HoaDonDTO> list = search(keyword, trangThai, loaiHoaDon, minPrice, maxPrice, startDate, endDate);

        try (org.apache.poi.ss.usermodel.Workbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook();
                java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream()) {

            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Danh sách hóa đơn");

            // Header Row
            String[] headers = { "STT", "Mã hóa đơn", "Tên nhân viên", "Khách hàng", "Số điện thoại", "Loại hóa đơn",
                    "Tổng tiền (đ)", "Ngày tạo", "Trạng thái" };
            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);

            // Style for header
            org.apache.poi.ss.usermodel.CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            for (int i = 0; i < headers.length; i++) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Data Rows
            int rowIdx = 1;
            for (HoaDonDTO dto : list) {
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIdx++);

                row.createCell(0).setCellValue(rowIdx - 1);
                row.createCell(1).setCellValue(dto.getMaHoaDon() != null ? dto.getMaHoaDon() : "");
                row.createCell(2).setCellValue(dto.getNguoiTao() != null ? dto.getNguoiTao() : "");
                row.createCell(3).setCellValue(dto.getTenKhachHang() != null ? dto.getTenKhachHang() : "");
                row.createCell(4).setCellValue(dto.getSdtKhachHang() != null ? dto.getSdtKhachHang() : "");
                row.createCell(5).setCellValue(dto.getLoaiHoaDon() != null ? dto.getLoaiHoaDon() : "");

                org.apache.poi.ss.usermodel.Cell priceCell = row.createCell(6);
                priceCell.setCellValue(dto.getTongTien() != null ? dto.getTongTien().doubleValue() : 0.0);

                String dateStr = dto.getNgayTao() != null
                        ? dto.getNgayTao().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
                        : "";
                row.createCell(7).setCellValue(dateStr);

                row.createCell(8).setCellValue(getStatusName(dto.getTrangThai()));
            }

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    private HoaDonDTO mapToDTO(HoaDon h) {
        List<ChiTietHoaDon> details = chiTietHoaDonRepository.findByHoaDonId(h.getId());
        int soLuong = details.stream()
                .mapToInt(d -> d.getSoLuong() != null ? d.getSoLuong() : 0)
                .sum();

        String tenKh = "";
        String sdtKh = "";
        if (h.getKhachHang() != null) {
            tenKh = h.getKhachHang().getHoTen();
            sdtKh = h.getKhachHang().getSoDienThoai();
        } else {
            tenKh = h.getTenNguoiNhan();
            sdtKh = h.getSdtNguoiNhan();
        }

        String nguoiTao = "";
        String maNhanVien = "";
        if (h.getNhanVien() != null) {
            nguoiTao = h.getNhanVien().getHoTen();
            maNhanVien = h.getNhanVien().getMaNhanVien();
        } else if (h.getNguoiTao() != null) {
            nguoiTao = h.getNguoiTao();
            maNhanVien = "NV_AUTO";
        } else {
            nguoiTao = "NV_AUTO";
            maNhanVien = "NV_AUTO";
        }

        String loaiHdStr = "N/A";
        if (h.getLoaiHoaDon() != null) {
            loaiHdStr = h.getLoaiHoaDon() ? "Trực tuyến" : "Tại quầy";
        }

        String email = "";
        if (h.getKhachHang() != null) {
            email = h.getKhachHang().getEmail();
        }

        String tenVoucher = null;
        String maVoucher = null;
        BigDecimal giaTriGiam = null;
        String loaiGiamGia = null;
        if (h.getPhieuGiamGia() != null) {
            tenVoucher = h.getPhieuGiamGia().getTenVoucher();
            maVoucher = h.getPhieuGiamGia().getMaVoucher();
            giaTriGiam = h.getPhieuGiamGia().getGiaTriGiam();
            loaiGiamGia = h.getPhieuGiamGia().getLoaiGiamGia();
        }

        return HoaDonDTO.builder()
                .id(h.getId())
                .maHoaDon(h.getMaHoaDon())
                .nguoiTao(nguoiTao)
                .tenKhachHang(tenKh)
                .sdtKhachHang(sdtKh)
                .soLuong(soLuong)
                .ngayTao(h.getNgayTao())
                .tongTien(h.getTongTien())
                .loaiHoaDon(loaiHdStr)
                .trangThai(h.getTrangThai())
                .maNhanVien(maNhanVien)
                .email(email)
                .diaChiGiao(h.getDiaChiGiao())
                .ghiChu(h.getGhiChu())
                .tienGiam(h.getTienGiam())
                .phiShip(h.getPhiShip())
                .tenVoucher(tenVoucher)
                .maVoucher(maVoucher)
                .giaTriGiam(giaTriGiam)
                .loaiGiamGia(loaiGiamGia)
                .build();
    }

    public java.util.Optional<HoaDonDTO> findById(Long id) {
        return hoaDonRepository.findById(id).map(this::mapToDTO);
    }

    public HoaDonDTO create(HoaDon hoaDon) {
        hoaDon.setNgayTao(LocalDateTime.now());
        if (hoaDon.getMaHoaDon() == null || hoaDon.getMaHoaDon().isEmpty()) {
            hoaDon.setMaHoaDon("HD" + System.currentTimeMillis());
        }
        hoaDon.setPhiShip(BigDecimal.valueOf(30000));
        HoaDon saved = hoaDonRepository.save(hoaDon);

        // Record history log
        LichSuHoaDon history = LichSuHoaDon.builder()
                .hoaDon(saved)
                .hanhDong("Tạo đơn hàng")
                .ngayTao(LocalDateTime.now())
                .ghiChu("Hệ thống tự động tạo đơn hàng")
                .build();
        lichSuHoaDonRepository.save(history);

        return mapToDTO(saved);
    }

    public java.util.Optional<HoaDonDTO> update(Long id, HoaDon hoaDonDetails) {
        return hoaDonRepository.findById(id).map(existing -> {
            Integer oldStatus = existing.getTrangThai();
            Integer newStatus = hoaDonDetails.getTrangThai();

            existing.setTenNguoiNhan(hoaDonDetails.getTenNguoiNhan());
            existing.setSdtNguoiNhan(hoaDonDetails.getSdtNguoiNhan());
            existing.setLoaiHoaDon(hoaDonDetails.getLoaiHoaDon());
            existing.setTrangThai(hoaDonDetails.getTrangThai());
            existing.setTongTienThanhToan(hoaDonDetails.getTongTienThanhToan());
            existing.setGhiChu(hoaDonDetails.getGhiChu());
            existing.setNgayCapNhat(LocalDateTime.now());
            existing.setPhiShip(BigDecimal.valueOf(30000));
            HoaDon updated = hoaDonRepository.save(existing);

            // Record status change log
            if (!oldStatus.equals(newStatus)) {
                String statusName = getStatusName(newStatus);
                String customNote = hoaDonDetails.getGhiChu();
                if (customNote == null || customNote.trim().isEmpty()) {
                    customNote = "Chuyển trạng thái sang: " + statusName;
                }
                LichSuHoaDon history = LichSuHoaDon.builder()
                        .hoaDon(updated)
                        .hanhDong("Cập nhật trạng thái")
                        .ngayTao(LocalDateTime.now())
                        .ghiChu(customNote)
                        .build();
                lichSuHoaDonRepository.save(history);
            }

            return mapToDTO(updated);
        });
    }

    public List<LichSuHoaDon> getHistoryByHoaDonId(Long id) {
        return lichSuHoaDonRepository.findByHoaDonIdOrderByNgayTaoDesc(id);
    }

    private String getStatusName(Integer status) {
        switch (status) {
            case 0:
                return "Chờ xác nhận";
            case 1:
                return "Đã xác nhận";
            case 2:
                return "Đang xử lý";
            case 3:
                return "Đang giao";
            case 4:
                return "Đã giao";
            case 5:
                return "Giao hàng thất bại";
            case 6:
                return "Hoàn thành";
            case 7:
                return "Đã huỷ";
            case 8:
                return "Yêu cầu huỷ";
            case 9:
                return "Đã hoàn tiền";
            default:
                return "N/A";
        }
    }

    public void delete(Long id) {
        hoaDonRepository.deleteById(id);
    }

    public List<java.util.Map<String, Object>> getItemsByHoaDonId(Long hoaDonId) {
        List<com.example.be.entity.ChiTietHoaDon> details = chiTietHoaDonRepository.findByHoaDonId(hoaDonId);
        return details.stream().map(d -> {
            java.util.Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", d.getId());
            map.put("soLuong", d.getSoLuong());
            map.put("donGia", d.getDonGia());
            map.put("thanhTien", d.getThanhTien());
            if (d.getSanPhamChiTiet() != null) {
                map.put("maChiTiet", d.getSanPhamChiTiet().getMa());
                map.put("hinhAnh", d.getSanPhamChiTiet().getHinhAnh());
                if (d.getSanPhamChiTiet().getSanPham() != null) {
                    map.put("tenSanPham", d.getSanPhamChiTiet().getSanPham().getTenSanPham());
                } else {
                    map.put("tenSanPham", "Giày Thể Thao VShoes Pegasus Pro");
                }
                if (d.getSanPhamChiTiet().getMauSac() != null) {
                    map.put("mauSac", d.getSanPhamChiTiet().getMauSac().getTenMauSac());
                } else {
                    map.put("mauSac", "Blue Navy");
                }
                if (d.getSanPhamChiTiet().getCoGiay() != null) {
                    map.put("coGiay", d.getSanPhamChiTiet().getCoGiay().getSizeGiay());
                } else {
                    map.put("coGiay", "42");
                }
            } else {
                map.put("tenSanPham", "Giày Thể Thao VShoes Pegasus Pro");
                map.put("mauSac", "Blue Navy");
                map.put("coGiay", "42");
                map.put("hinhAnh", "/images/logo.png");
            }
            return map;
        }).collect(Collectors.toList());
    }

    public void generateTestData() {
        if (hoaDonRepository.count() == 0) {
            // Find an existing SanPhamChiTiet if available to link
            SanPhamChiTiet sampleSpct = null;
            try {
                List<SanPhamChiTiet> list = sanPhamChiTietRepository.findAll();
                if (!list.isEmpty()) {
                    sampleSpct = list.get(0);
                }
            } catch (Exception e) {
                System.out.println("No SanPhamChiTiet found or error fetching: " + e.getMessage());
            }

            for (int i = 1; i <= 5; i++) {
                BigDecimal invoiceTotal = new BigDecimal("350000").multiply(new BigDecimal(i));
                HoaDon hd = HoaDon.builder()
                        .maHoaDon("HD_" + System.currentTimeMillis() + "_" + i)
                        .loaiHoaDon(i % 2 == 0)
                        .tenNguoiNhan("Khách hàng Test " + i)
                        .sdtNguoiNhan("098765432" + i)
                        .tongTien(invoiceTotal)
                        .trangThai(i % 3)
                        .ngayTao(LocalDateTime.now())
                        .nguoiTao("Nhân viên " + i)
                        .build();
                hd = hoaDonRepository.save(hd);

                // Add 1 test ChiTietHoaDon for this invoice
                ChiTietHoaDon detail = ChiTietHoaDon.builder()
                        .hoaDon(hd)
                        .sanPhamChiTiet(sampleSpct)
                        .soLuong(1)
                        .donGia(invoiceTotal)
                        .thanhTien(invoiceTotal)
                        .build();
                chiTietHoaDonRepository.save(detail);
            }
        }
    }
}
