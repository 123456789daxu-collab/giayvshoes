package com.example.be.service;

import com.example.be.dto.HoaDonDTO;
import com.example.be.entity.ChiTietHoaDon;
import com.example.be.entity.HoaDon;
import com.example.be.entity.LichSuHoaDon;
import com.example.be.entity.SanPhamChiTiet;
import com.example.be.entity.SanPham;
import com.example.be.repository.SanPhamRepository;
import com.example.be.repository.ChiTietHoaDonRepository;
import com.example.be.repository.HoaDonRepository;
import com.example.be.repository.KhachHangRepository;
import com.example.be.repository.LichSuHoaDonRepository;
import com.example.be.repository.PhieuGiamGiaRepository;
import com.example.be.repository.SanPhamChiTietRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class HoaDonService {

    private final HoaDonRepository hoaDonRepository;
    private final ChiTietHoaDonRepository chiTietHoaDonRepository;
    private final SanPhamChiTietRepository sanPhamChiTietRepository;
    private final LichSuHoaDonRepository lichSuHoaDonRepository;
    private final KhachHangRepository khachHangRepository;
    private final PhieuGiamGiaRepository phieuGiamGiaRepository;
    private final SanPhamRepository sanPhamRepository;
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private EmailService emailService;


    public HoaDonService(HoaDonRepository hoaDonRepository,
                         ChiTietHoaDonRepository chiTietHoaDonRepository,
                         SanPhamChiTietRepository sanPhamChiTietRepository,
                         LichSuHoaDonRepository lichSuHoaDonRepository,
                         KhachHangRepository khachHangRepository,
                         PhieuGiamGiaRepository phieuGiamGiaRepository,
                         SanPhamRepository sanPhamRepository) {
        this.hoaDonRepository = hoaDonRepository;
        this.chiTietHoaDonRepository = chiTietHoaDonRepository;
        this.sanPhamChiTietRepository = sanPhamChiTietRepository;
        this.lichSuHoaDonRepository = lichSuHoaDonRepository;
        this.khachHangRepository = khachHangRepository;
        this.phieuGiamGiaRepository = phieuGiamGiaRepository;
        this.sanPhamRepository = sanPhamRepository;
    }

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
                
        return hoaDons.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    public BigDecimal getMaxPrice() {
        BigDecimal maxPrice = hoaDonRepository.getMaxPrice();
        return maxPrice != null ? maxPrice : BigDecimal.ZERO;
    }

    /** Tổng số hóa đơn trong DB — dùng để debug */
    public long countAll() {
        return hoaDonRepository.count();
    }

    /** 5 hóa đơn mới nhất — dùng để debug */
    public List<HoaDonDTO> getLatest5() {
        return hoaDonRepository.findAll(
            org.springframework.data.domain.PageRequest.of(0, 5,
                org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "ngayTao")))
            .stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    public byte[] exportInvoicesToExcel(String keyword, Integer trangThai, String loaiHoaDon, 
                                         BigDecimal minPrice, BigDecimal maxPrice, 
                                         LocalDateTime startDate, LocalDateTime endDate) throws java.io.IOException {
        List<HoaDonDTO> list = search(keyword, trangThai, loaiHoaDon, minPrice, maxPrice, startDate, endDate);
        
        try (org.apache.poi.ss.usermodel.Workbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook();
             java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream()) {
             
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Danh sách hóa đơn");
            
            // Header Row
            String[] headers = {"STT", "Mã hóa đơn", "Tên nhân viên", "Khách hàng", "Số điện thoại", "Loại hóa đơn", "Tổng tiền (đ)", "Số lượng", "Ngày tạo", "Trạng thái"};
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
                
                row.createCell(7).setCellValue(dto.getSoLuong() != null ? dto.getSoLuong() : 0);

                String dateStr = dto.getNgayTao() != null ? dto.getNgayTao().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) : "";
                row.createCell(8).setCellValue(dateStr);
                
                row.createCell(9).setCellValue(getStatusName(dto.getTrangThai()));
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
        } else {
            String sdtSearch = (sdtKh != null) ? sdtKh.trim() : "";
            if (!sdtSearch.isEmpty() && !"-".equals(sdtSearch)) {
                java.util.Optional<com.example.be.entity.KhachHang> khOpt = khachHangRepository.findBySoDienThoai(sdtSearch);
                if (khOpt.isPresent()) {
                    email = khOpt.get().getEmail();
                }
            }
        }
        if ((email == null || email.isBlank()) && h.getGhiChu() != null && h.getGhiChu().contains("| EMAIL:")) {
            try {
                // Dùng regex để trích email chính xác, tránh lấy dư phần đuôi sau khi ghi chú được nối thêm
                java.util.regex.Matcher m = java.util.regex.Pattern
                    .compile("\\| EMAIL:([^\\|\\s]+)")
                    .matcher(h.getGhiChu());
                if (m.find()) {
                    email = m.group(1).trim();
                }
            } catch (Exception ignored) {}
        }


        String tenVoucher   = null;
        String maVoucher    = null;
        BigDecimal giaTriGiam = null;
        String loaiGiamGia  = null;
        if (h.getPhieuGiamGia() != null) {
            tenVoucher  = h.getPhieuGiamGia().getTenVoucher();
            maVoucher   = h.getPhieuGiamGia().getMaVoucher();
            giaTriGiam  = h.getPhieuGiamGia().getGiaTriGiam();
            loaiGiamGia = h.getPhieuGiamGia().getLoaiGiamGia();
        }

        // Nếu tong_tien trong DB là null hoặc 0, tính lại từ chi tiết đơn hàng
        BigDecimal tongTienHieuQua = h.getTongTien();
        if (tongTienHieuQua == null || tongTienHieuQua.compareTo(BigDecimal.ZERO) == 0) {
            BigDecimal subtotal = details.stream()
                    .map(d -> d.getThanhTien() != null ? d.getThanhTien() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (subtotal.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal ship = h.getPhiShip() != null ? h.getPhiShip() : BigDecimal.ZERO;
                BigDecimal giam = h.getTienGiam() != null ? h.getTienGiam() : BigDecimal.ZERO;
                tongTienHieuQua = subtotal.add(ship).subtract(giam).max(BigDecimal.ZERO);
            }
        }

        List<java.util.Map<String, Object>> chiTietList = details.stream().map(d -> {
            java.util.Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", d.getId());
            map.put("soLuong", d.getSoLuong());
            map.put("donGia", d.getDonGia());
            map.put("thanhTien", d.getThanhTien());
            if (d.getSanPhamChiTiet() != null) {
                com.example.be.entity.SanPhamChiTiet spct = d.getSanPhamChiTiet();
                map.put("maChiTiet", spct.getMa());
                String imgUrl = null;
                if (spct.getDanhSachHinhAnh() != null && !spct.getDanhSachHinhAnh().isEmpty()) {
                    imgUrl = spct.getDanhSachHinhAnh().get(0);
                } else if (spct.getHinhAnh() != null && !spct.getHinhAnh().isBlank() && !spct.getHinhAnh().equals("[]") && !spct.getHinhAnh().equals("[\"\"]")) {
                    imgUrl = spct.getHinhAnh();
                } else if (spct.getSanPham() != null) {
                    List<com.example.be.entity.SanPhamChiTiet> siblings = sanPhamChiTietRepository.findBySanPhamId(spct.getSanPham().getId());
                    for (com.example.be.entity.SanPhamChiTiet sib : siblings) {
                        if (sib.getDanhSachHinhAnh() != null && !sib.getDanhSachHinhAnh().isEmpty()) {
                            imgUrl = sib.getDanhSachHinhAnh().get(0);
                            break;
                        }
                    }
                }
                map.put("hinhAnh", imgUrl);
                if (spct.getSanPham() != null) {
                    map.put("tenSanPham", spct.getSanPham().getTenSanPham());
                    map.put("sanPhamId", spct.getSanPham().getId());
                } else {
                    map.put("tenSanPham", "Giày Chạy Bộ VHOES");
                }
                map.put("sanPhamChiTietId", spct.getId());
                map.put("soLuongTon", spct.getSoLuongTon() != null ? spct.getSoLuongTon() : 0);
                if (spct.getMauSac() != null) {
                    map.put("mauSac", spct.getMauSac().getTenMauSac());
                }
                if (spct.getCoGiay() != null) {
                    map.put("coGiay", spct.getCoGiay().getSizeGiay());
                }
            } else {
                map.put("tenSanPham", "Giày Chạy Bộ VHOES");
                map.put("soLuongTon", 0);
            }
            return map;
        }).collect(Collectors.toList());

        return HoaDonDTO.builder()
                .id(h.getId())
                .maHoaDon(h.getMaHoaDon())
                .nguoiTao(nguoiTao)
                .tenKhachHang(tenKh)
                .sdtKhachHang(sdtKh)
                .tenNguoiNhan(h.getTenNguoiNhan() != null ? h.getTenNguoiNhan() : tenKh)
                .sdtNguoiNhan(h.getSdtNguoiNhan() != null ? h.getSdtNguoiNhan() : sdtKh)
                .soLuong(soLuong)
                .ngayTao(h.getNgayTao())
                .tongTien(tongTienHieuQua)
                .loaiHoaDon(loaiHdStr)
                .trangThai(h.getTrangThai())
                .maNhanVien(maNhanVien)
                .email(email)
                .diaChiGiao(h.getDiaChiGiao())
                .ghiChu(cleanGhiChu(h.getGhiChu()))
                .tienGiam(h.getTienGiam())
                .phiShip(h.getPhiShip())
                .tenVoucher(tenVoucher)
                .maVoucher(maVoucher)
                .giaTriGiam(giaTriGiam)
                .loaiGiamGia(loaiGiamGia)
                .soLanSuaThongTin(h.getSoLanSuaThongTin() != null ? h.getSoLanSuaThongTin() : 0)
                .chiTietList(chiTietList)
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
        if (hoaDon.getSdtNguoiNhan() != null && !hoaDon.getSdtNguoiNhan().trim().isEmpty()) {
            String sdt = hoaDon.getSdtNguoiNhan().trim();
            if (!sdt.matches("\\d{10}")) {
                throw new IllegalArgumentException("Số điện thoại người nhận phải đúng 10 chữ số!");
            }
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

    @Transactional
    public java.util.Optional<HoaDonDTO> update(Long id, HoaDon hoaDonDetails) {
        return hoaDonRepository.findById(id).map(existing -> {
            Integer oldStatus = existing.getTrangThai();
            Integer newStatus = hoaDonDetails.getTrangThai();

            // 1. Kiểm tra và xử lý tồn kho TRƯỚC TIÊN khi thay đổi trạng thái
            if (newStatus != null && !newStatus.equals(oldStatus)) {
                boolean oldDecremented = isStockDecrementedStatus(oldStatus);
                boolean newDecremented = isStockDecrementedStatus(newStatus);
                
                if (!oldDecremented && newDecremented) {
                    reduceStockForInvoice(existing.getId());
                } else if (oldDecremented && !newDecremented) {
                    restoreStockForInvoice(existing.getId());
                }
            }

            // 2. Cập nhật thông tin hóa đơn
            existing.setTenNguoiNhan(hoaDonDetails.getTenNguoiNhan());
            if (hoaDonDetails.getSdtNguoiNhan() != null && !hoaDonDetails.getSdtNguoiNhan().trim().isEmpty()) {
                String sdt = hoaDonDetails.getSdtNguoiNhan().trim();
                if (!sdt.matches("\\d{10}")) {
                    throw new IllegalArgumentException("Số điện thoại người nhận phải đúng 10 chữ số!");
                }
            }
            existing.setSdtNguoiNhan(hoaDonDetails.getSdtNguoiNhan());
            existing.setLoaiHoaDon(hoaDonDetails.getLoaiHoaDon());
            existing.setTrangThai(newStatus);
            existing.setTongTienThanhToan(hoaDonDetails.getTongTienThanhToan());
            existing.setGhiChu(hoaDonDetails.getGhiChu());
            existing.setNgayCapNhat(LocalDateTime.now());
            HoaDon updated = hoaDonRepository.save(existing);

            // 3. Ghi lịch sử trạng thái
            if (newStatus != null && !newStatus.equals(oldStatus)) {
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
            case 0: return "Chờ xác nhận";
            case 1: return "Đã xác nhận";
            case 2: return "Đang xử lý";
            case 3: return "Đang giao";
            case 4: return "Đã giao";
            case 5: return "Giao hàng thất bại";
            case 6: return "Hoàn thành";
            case 7: return "Đã huỷ";
            case 8: return "Yêu cầu huỷ";
            case 9: return "Đã hoàn tiền";
            default: return "N/A";
        }
    }

    public void delete(Long id) {
        hoaDonRepository.deleteById(id);
    }

    /**
     * Cập nhật thông tin nhận hàng, trạng thái và ghi chú.
     */
    @Transactional
    public java.util.Optional<HoaDonDTO> patchShippingAndStatusAndNote(
            Long id,
            String tenNguoiNhan,
            String sdtNguoiNhan,
            String diaChiGiao,
            Integer newTrangThai,
            String newGhiChu) {
        return hoaDonRepository.findById(id).map(existing -> {
            boolean isModifyingShipping = (tenNguoiNhan != null && !tenNguoiNhan.trim().isEmpty() && !tenNguoiNhan.trim().equals(existing.getTenNguoiNhan()))
                    || (sdtNguoiNhan != null && !sdtNguoiNhan.trim().isEmpty() && !sdtNguoiNhan.trim().equals(existing.getSdtNguoiNhan()))
                    || (diaChiGiao != null && !diaChiGiao.trim().isEmpty() && !diaChiGiao.trim().equals(existing.getDiaChiNhan()));

            if (isModifyingShipping) {
                if (existing.getTrangThai() != null && existing.getTrangThai() != 0) {
                    throw new IllegalArgumentException("Không thể chỉnh sửa thông tin nhận hàng khi đơn hàng đã được xác nhận!");
                }
                int editCount = (existing.getSoLanSuaThongTin() != null) ? existing.getSoLanSuaThongTin() : 0;
                if (editCount == 0) {
                    List<LichSuHoaDon> histories = lichSuHoaDonRepository.findByHoaDonIdOrderByNgayTaoDesc(existing.getId());
                    long histCount = histories.stream()
                            .filter(hItem -> "Cập nhật thông tin nhận hàng".equalsIgnoreCase(hItem.getHanhDong()))
                            .count();
                    editCount = (int) histCount;
                }
                if (editCount >= 1) {
                    throw new IllegalArgumentException("Quý khách chỉ được thay đổi thông tin một lần");
                }
            }

            boolean infoChanged = false;
            StringBuilder logDetails = new StringBuilder("Cập nhật thông tin nhận hàng:");

            if (tenNguoiNhan != null && !tenNguoiNhan.trim().isEmpty() && !tenNguoiNhan.trim().equals(existing.getTenNguoiNhan())) {
                existing.setTenNguoiNhan(tenNguoiNhan.trim());
                infoChanged = true;
                logDetails.append(" Tên: ").append(tenNguoiNhan.trim());
            }

            if (sdtNguoiNhan != null && !sdtNguoiNhan.trim().isEmpty() && !sdtNguoiNhan.trim().equals(existing.getSdtNguoiNhan())) {
                String sdt = sdtNguoiNhan.trim();
                if (!sdt.matches("\\d{10}")) {
                    throw new IllegalArgumentException("Số điện thoại người nhận phải đúng 10 chữ số!");
                }
                existing.setSdtNguoiNhan(sdt);
                infoChanged = true;
                logDetails.append(" SĐT: ").append(sdt);
            }

            if (diaChiGiao != null && !diaChiGiao.trim().isEmpty() && !diaChiGiao.trim().equals(existing.getDiaChiNhan())) {
                existing.setDiaChiNhan(diaChiGiao.trim());
                infoChanged = true;
                logDetails.append(" Địa chỉ: ").append(diaChiGiao.trim());
            }

            Integer oldStatus = existing.getTrangThai();
            if (newTrangThai != null && !newTrangThai.equals(oldStatus)) {
                // Xử lý tồn kho khi trạng thái thay đổi
                boolean oldDecremented = isStockDecrementedStatus(oldStatus);
                boolean newDecremented = isStockDecrementedStatus(newTrangThai);
                if (!oldDecremented && newDecremented) {
                    reduceStockForInvoice(existing.getId());
                } else if (oldDecremented && !newDecremented) {
                    restoreStockForInvoice(existing.getId());
                }

                existing.setTrangThai(newTrangThai);

                String note = (newGhiChu != null && !newGhiChu.isBlank())
                        ? newGhiChu
                        : "Chuyển trạng thái sang: " + getStatusName(newTrangThai);
                LichSuHoaDon history = LichSuHoaDon.builder()
                        .hoaDon(existing)
                        .hanhDong("Cập nhật trạng thái")
                        .ngayTao(LocalDateTime.now())
                        .ghiChu(note)
                        .build();
                lichSuHoaDonRepository.save(history);
            } else if (infoChanged) {
                int currentCount = (existing.getSoLanSuaThongTin() != null) ? existing.getSoLanSuaThongTin() : 0;
                existing.setSoLanSuaThongTin(currentCount + 1);

                LichSuHoaDon history = LichSuHoaDon.builder()
                        .hoaDon(existing)
                        .hanhDong("Cập nhật thông tin nhận hàng")
                        .ngayTao(LocalDateTime.now())
                        .ghiChu(logDetails.toString())
                        .build();
                lichSuHoaDonRepository.save(history);
            }

            if (newGhiChu != null && !newGhiChu.isBlank()) {
                existing.setGhiChu(cleanGhiChu(newGhiChu));
            }

            existing.setNgayCapNhat(LocalDateTime.now());
            HoaDon updated = hoaDonRepository.save(existing);
            return mapToDTO(updated);
        });
    }

    /**
     * Chỉ cập nhật trangThai và ghiChu mà KHÔNG đụng đến các trường khác.
     * Dùng cho tracking client khi xác nhận thanh toán online.
     */
    @Transactional
    public java.util.Optional<HoaDonDTO> patchStatusAndNote(Long id, Integer newTrangThai, String newGhiChu) {
        return patchShippingAndStatusAndNote(id, null, null, null, newTrangThai, newGhiChu);
    }

    /**
     * Khách hàng hủy đơn hàng hoặc gửi yêu cầu hủy đơn hàng.
     * - Trạng thái 0 (Chờ xác nhận): Chuyển thẳng sang 7 (Đã huỷ), hoàn kho nếu cần, ghi log Lịch sử.
     * - Trạng thái 1 (Đã xác nhận) hoặc 2 (Đang xử lý): Chuyển sang 8 (Yêu cầu huỷ) để Admin duyệt.
     */
    @Transactional
    public HoaDonDTO cancelOrderByCustomer(Long id, String reason) {
        HoaDon hd = hoaDonRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng với mã #" + id));

        Integer currentStatus = hd.getTrangThai();
        if (currentStatus == null) {
            throw new IllegalArgumentException("Trạng thái đơn hàng không hợp lệ!");
        }

        if (currentStatus == 7) {
            throw new IllegalArgumentException("Đơn hàng này đã được hủy trước đó!");
        }
        if (currentStatus == 6) {
            throw new IllegalArgumentException("Đơn hàng đã hoàn thành, không thể hủy!");
        }
        if (currentStatus == 3 || currentStatus == 4 || currentStatus == 5) {
            throw new IllegalArgumentException("Đơn hàng đang trong quá trình vận chuyển, vui lòng liên hệ Hotline 1900 6789 để được hỗ trợ!");
        }
        if (currentStatus == 8) {
            throw new IllegalArgumentException("Đơn hàng đã gửi yêu cầu hủy trước đó, vui lòng chờ Quản trị viên xử lý!");
        }

        String fullReason = (reason != null && !reason.trim().isEmpty()) ? reason.trim() : "Khách hàng hủy trên website";
        Integer targetStatus;
        String actionName;
        String logNote;

        if (currentStatus == 0) {
            // Chờ xác nhận -> Đã huỷ
            targetStatus = 7;
            actionName = "Khách hàng hủy đơn hàng";
            logNote = "Khách hàng tự hủy đơn hàng trên website. Lý do: " + fullReason;
        } else if (currentStatus == 1 || currentStatus == 2) {
            // Đã xác nhận / Đang xử lý -> Yêu cầu huỷ
            targetStatus = 8;
            actionName = "Khách hàng yêu cầu hủy đơn";
            logNote = "Khách hàng gửi yêu cầu hủy đơn hàng. Lý do: " + fullReason;
        } else {
            targetStatus = 7;
            actionName = "Khách hàng hủy đơn hàng";
            logNote = "Lý do: " + fullReason;
        }

        // Xử lý hoàn kho nếu chuyển sang 7 (Đã hủy) mà đơn trước đó đã trừ kho
        boolean oldDecremented = isStockDecrementedStatus(currentStatus);
        boolean newDecremented = isStockDecrementedStatus(targetStatus);
        if (oldDecremented && !newDecremented) {
            restoreStockForInvoice(hd.getId());
        }

        hd.setTrangThai(targetStatus);
        String currentGhiChu = hd.getGhiChu() != null ? hd.getGhiChu() : "";
        hd.setGhiChu(cleanGhiChu(currentGhiChu + " | " + logNote));
        hd.setNgayCapNhat(LocalDateTime.now());
        HoaDon saved = hoaDonRepository.save(hd);

        // Lưu lịch sử hóa đơn để Admin xem chi tiết
        LichSuHoaDon history = LichSuHoaDon.builder()
                .hoaDon(saved)
                .hanhDong(actionName)
                .ngayTao(LocalDateTime.now())
                .ghiChu(logNote)
                .build();
        lichSuHoaDonRepository.save(history);

        HoaDonDTO dto = mapToDTO(saved);

        // Gửi email thông báo cập nhật nếu có email
        try {
            if (emailService != null) {
                String targetEmail = hd.getKhachHang() != null ? hd.getKhachHang().getEmail() : null;
                if (targetEmail == null || targetEmail.isBlank()) {
                    if (dto.getEmail() != null && !dto.getEmail().isBlank()) {
                        targetEmail = dto.getEmail();
                    }
                }
                if (targetEmail != null && !targetEmail.isBlank()) {
                    List<Map<String, Object>> items = getItemsByHoaDonId(saved.getId());
                    emailService.sendInvoiceEmail(dto, items);
                }
            }
        } catch (Exception e) {
            System.err.println("Không thể gửi email cập nhật hủy đơn: " + e.getMessage());
        }

        return dto;
    }

    public static String cleanGhiChu(String input) {
        if (input == null || input.isBlank()) return "";
        String[] parts = input.split("\\|");
        java.util.LinkedHashSet<String> uniqueParts = new java.util.LinkedHashSet<>();
        for (String part : parts) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) {
                uniqueParts.add(trimmed);
            }
        }
        return String.join(" | ", uniqueParts);
    }


    /**
     * Tạo hóa đơn từ trang bán hàng — bao gồm chi tiết hóa đơn.
     * Payload:
     *   loaiHoaDon, tenNguoiNhan, sdtNguoiNhan, diaChiGiao, ghiChu,
     *   trangThai, tienGiam, phiShip, tongTien,
     *   khachHangId (nullable), phieuGiamGiaId (nullable),
     *   items: [{sanPhamChiTietId, soLuong, donGia, thanhTien}]
     */
    @Transactional
    public HoaDonDTO createFromBanHang(Map<String, Object> payload) {
        // ---- Build HoaDon ----
        HoaDon hd = new HoaDon();
        hd.setMaHoaDon("HD" + System.currentTimeMillis());
        hd.setNgayTao(LocalDateTime.now());

        // Loại hóa đơn
        Object loaiHD = payload.get("loaiHoaDon");
        if (loaiHD instanceof Boolean) {
            hd.setLoaiHoaDon(loaiHD);
        } else if (loaiHD != null) {
            hd.setLoaiHoaDon(Boolean.parseBoolean(loaiHD.toString()));
        }

        hd.setTenNguoiNhan(strOrNull(payload, "tenNguoiNhan"));
        String sdtNguoiNhan = strOrNull(payload, "sdtNguoiNhan");
        if (sdtNguoiNhan != null && !sdtNguoiNhan.matches("\\d{10}")) {
            throw new IllegalArgumentException("Số điện thoại người nhận phải đúng 10 chữ số!");
        }
        hd.setSdtNguoiNhan(sdtNguoiNhan);
        hd.setDiaChiGiao(strOrNull(payload, "diaChiGiao"));
        hd.setGhiChu(strOrNull(payload, "ghiChu"));

        // Trạng thái — mặc định 0 (Chờ xác nhận) để không trigger giảm tồn kho ngay
        Object ts = payload.get("trangThai");
        int initialTrangThai = (ts != null) ? ((Number) ts).intValue() : 0;
        hd.setTrangThai(initialTrangThai);

        // Tiền giảm
        Object tienGiam = payload.get("tienGiam");
        if (tienGiam != null) hd.setTienGiamGia(new BigDecimal(tienGiam.toString()));

        // Phí ship
        Object phiShip = payload.get("phiShip");
        hd.setTienVanChuyen(phiShip != null ? new BigDecimal(phiShip.toString()) : BigDecimal.valueOf(30000));

        // Tong tien
        Object tongTien = payload.get("tongTien");
        BigDecimal clientTotal = (tongTien != null && !tongTien.toString().isBlank()) ? new BigDecimal(tongTien.toString()) : BigDecimal.ZERO;
        hd.setTongTienThanhToan(clientTotal);

        // Khách hàng
        Object khId = payload.get("khachHangId");
        if (khId != null) {
            khachHangRepository.findById(((Number) khId).longValue())
                    .ifPresent(hd::setKhachHang);
        }

        // Phiếu giảm giá
        Object pggId = payload.get("phieuGiamGiaId");
        if (pggId != null) {
            java.util.Optional<com.example.be.entity.PhieuGiamGia> pggOpt = phieuGiamGiaRepository.findById(((Number) pggId).longValue());
            if (pggOpt.isPresent()) {
                com.example.be.entity.PhieuGiamGia pgg = pggOpt.get();
                LocalDateTime now = LocalDateTime.now();
                if (pgg.getTrangThai() == null || pgg.getTrangThai() != 1) {
                    throw new IllegalArgumentException("Phiếu giảm giá này đã hết hạn, vui lòng chọn phiếu giảm giá khác!");
                }
                if (pgg.getNgayBatDau() != null && now.isBefore(pgg.getNgayBatDau())) {
                    throw new IllegalArgumentException("Chưa tới ngày áp dụng phiếu giảm giá này!");
                }
                if (pgg.getNgayKetThuc() != null && now.isAfter(pgg.getNgayKetThuc())) {
                    throw new IllegalArgumentException("Phiếu giảm giá này đã hết hạn, vui lòng chọn phiếu giảm giá khác!");
                }
                if (pgg.getSoLuong() != null && pgg.getSoLuongDaDung() != null && pgg.getSoLuongDaDung() >= pgg.getSoLuong()) {
                    throw new IllegalArgumentException("Phiếu giảm giá này đã hết lượt sử dụng, vui lòng chọn phiếu giảm giá khác!");
                }
                hd.setPhieuGiamGia(pgg);
            }
        }

        // ---- Kiểm tra tồn kho trước khi lưu ----
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> items = (List<Map<String, Object>>) payload.get("items");
        if (items != null) {
            for (Map<String, Object> it : items) {
                Object spctId = it.get("sanPhamChiTietId");
                Object soLuongObj = it.get("soLuong");
                if (spctId != null) {
                    int reqQty = soLuongObj != null ? ((Number) soLuongObj).intValue() : 1;
                    java.util.Optional<SanPhamChiTiet> spctOpt = sanPhamChiTietRepository.findById(((Number) spctId).longValue());
                    if (spctOpt.isPresent()) {
                        SanPhamChiTiet spct = spctOpt.get();
                        String tenSp = (spct.getSanPham() != null) ? spct.getSanPham().getTenSanPham() : "Sản phẩm ID " + spctId;

                        boolean isProductActive = (spct.getSanPham() == null || spct.getSanPham().getTrangThai() == null || spct.getSanPham().getTrangThai() == 1);
                        boolean isVariantActive = (spct.getTrangThai() != null && spct.getTrangThai() == 1);

                        if (!isProductActive || !isVariantActive) {
                            throw new IllegalArgumentException("Sản phẩm '" + tenSp + "' đã ngừng kinh doanh và không thể thanh toán!");
                        }

                        int stock = spct.getSoLuongTon() != null ? spct.getSoLuongTon() : 0;
                        if (stock < reqQty) {
                            throw new IllegalArgumentException(
                                "Sản phẩm '" + tenSp + "' không đủ tồn kho! Kho còn: " + stock + ", yêu cầu: " + reqQty);
                        }
                    }
                }
            }
        }

        HoaDon saved = hoaDonRepository.save(hd);

        // ---- Build ChiTietHoaDon list ----
        BigDecimal calculatedSubtotal = BigDecimal.ZERO;
        if (items != null) {
            for (Map<String, Object> it : items) {
                ChiTietHoaDon ct = new ChiTietHoaDon();
                ct.setHoaDon(saved);

                Object spctId = it.get("sanPhamChiTietId");
                if (spctId != null) {
                    sanPhamChiTietRepository.findById(((Number) spctId).longValue())
                            .ifPresent(ct::setSanPhamChiTiet);
                }

                Object soLuong = it.get("soLuong");
                ct.setSoLuong(soLuong != null ? ((Number) soLuong).intValue() : 1);

                Object donGia = it.get("donGia");
                ct.setDonGia(donGia != null ? new BigDecimal(donGia.toString()) : BigDecimal.ZERO);

                Object thanhTien = it.get("thanhTien");
                BigDecimal itemThanhTien = thanhTien != null ? new BigDecimal(thanhTien.toString()) : BigDecimal.ZERO;
                ct.setThanhTien(itemThanhTien);
                calculatedSubtotal = calculatedSubtotal.add(itemThanhTien);

                chiTietHoaDonRepository.save(ct);
            }
        }

        // Đảm bảo tổng tiền luôn đúng — luôn dùng calculatedTotal từ items thực tế
        BigDecimal calculatedTotal = calculatedSubtotal
                .add(saved.getTienVanChuyen() != null ? saved.getTienVanChuyen() : BigDecimal.ZERO)
                .subtract(saved.getTienGiamGia() != null ? saved.getTienGiamGia() : BigDecimal.ZERO);
        if (calculatedTotal.compareTo(BigDecimal.ZERO) < 0) {
            calculatedTotal = BigDecimal.ZERO;
        }

        // Luôn ghi đè tongTien bằng giá trị tính từ items thực tế nếu > 0
        // (tránh trường hợp client gửi tongTien = 0 hoặc sai)
        if (calculatedTotal.compareTo(BigDecimal.ZERO) > 0) {
            saved.setTongTienThanhToan(calculatedTotal);
            saved = hoaDonRepository.save(saved);
        } else if (clientTotal.compareTo(BigDecimal.ZERO) > 0) {
            // Fallback: dùng giá trị client gửi nếu items rỗng nhưng client có giá trị
            saved.setTongTienThanhToan(clientTotal);
            saved = hoaDonRepository.save(saved);
        }

        // ---- Ghi lịch sử ----
        LichSuHoaDon history = LichSuHoaDon.builder()
                .hoaDon(saved)
                .hanhDong("Tạo đơn hàng")
                .ngayTao(LocalDateTime.now())
                .ghiChu("Đơn tạo từ trang Bán hàng / Trực tuyến")
                .build();
        lichSuHoaDonRepository.save(history);

        HoaDonDTO dto = mapToDTO(saved);
        String clientTypedEmail = strOrNull(payload, "email");
        if (clientTypedEmail != null && !clientTypedEmail.isBlank() && clientTypedEmail.contains("@")) {
            dto.setEmail(clientTypedEmail.trim());
            if (saved.getKhachHang() != null) {
                try {
                    com.example.be.entity.KhachHang kh = saved.getKhachHang();
                    if (kh.getEmail() == null || kh.getEmail().isBlank() || !kh.getEmail().equalsIgnoreCase(clientTypedEmail.trim())) {
                        kh.setEmail(clientTypedEmail.trim());
                        khachHangRepository.save(kh);
                    }
                } catch (Exception ignored) {}
            }
        }
        if (emailService != null) {
            try {
                List<Map<String, Object>> invoiceItems = getItemsByHoaDonId(saved.getId());
                emailService.sendInvoiceEmail(dto, invoiceItems);
            } catch (Exception e) {
                System.err.println("Lỗi tự động gửi email hóa đơn: " + e.getMessage());
            }
        }
        return dto;
    }



    private String strOrNull(Map<String, Object> map, String key) {
        Object v = map.get(key);
        return (v != null && !v.toString().isBlank()) ? v.toString().trim() : null;
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
                com.example.be.entity.SanPhamChiTiet spct = d.getSanPhamChiTiet();
                map.put("maChiTiet", spct.getMa());

                String imgUrl = null;
                if (spct.getDanhSachHinhAnh() != null && !spct.getDanhSachHinhAnh().isEmpty()) {
                    imgUrl = spct.getDanhSachHinhAnh().get(0);
                } else if (spct.getHinhAnh() != null && !spct.getHinhAnh().isBlank() && !spct.getHinhAnh().equals("[]") && !spct.getHinhAnh().equals("[\"\"]")) {
                    imgUrl = spct.getHinhAnh();
                } else if (spct.getSanPham() != null) {
                    List<com.example.be.entity.SanPhamChiTiet> siblings = sanPhamChiTietRepository.findBySanPhamId(spct.getSanPham().getId());
                    for (com.example.be.entity.SanPhamChiTiet sib : siblings) {
                        if (sib.getDanhSachHinhAnh() != null && !sib.getDanhSachHinhAnh().isEmpty()) {
                            imgUrl = sib.getDanhSachHinhAnh().get(0);
                            break;
                        }
                    }
                }
                map.put("hinhAnh", imgUrl);
                map.put("sanPhamChiTietId", spct.getId());
                map.put("soLuongTon", spct.getSoLuongTon() != null ? spct.getSoLuongTon() : 0);

                if (spct.getSanPham() != null) {
                    map.put("sanPhamId", spct.getSanPham().getId());
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
                map.put("soLuongTon", 0);
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

    private boolean isStockDecrementedStatus(Integer status) {
        if (status == null) return false;
        return status == 1 || status == 2 || status == 3 || status == 4 || status == 6;
    }

    @Transactional
    public void reduceStockForInvoice(Long hoaDonId) {
        List<ChiTietHoaDon> details = chiTietHoaDonRepository.findByHoaDonId(hoaDonId);
        // Bước 1: Kiểm tra tất cả sản phẩm trước, nếu bất kỳ sản phẩm nào không đủ kho thì báo lỗi luôn
        for (ChiTietHoaDon ct : details) {
            SanPhamChiTiet spct = ct.getSanPhamChiTiet();
            if (spct != null) {
                int stock = spct.getSoLuongTon() != null ? spct.getSoLuongTon() : 0;
                int qty = ct.getSoLuong() != null ? ct.getSoLuong() : 0;
                if (stock < qty) {
                    String tenSp = (spct.getSanPham() != null) ? spct.getSanPham().getTenSanPham() : "Sản phẩm";
                    String mauSac = (spct.getMauSac() != null) ? spct.getMauSac().getTenMauSac() : "";
                    String coGiay = (spct.getCoGiay() != null) ? String.valueOf(spct.getCoGiay().getSizeGiay()) : "";
                    String variant = (!mauSac.isEmpty() || !coGiay.isEmpty())
                            ? " [" + mauSac + ((!mauSac.isEmpty() && !coGiay.isEmpty()) ? " - " : "") + coGiay + "]"
                            : "";
                    throw new IllegalArgumentException(
                        "Số lượng trong kho hiện đang không đủ để xác nhận đơn hàng! " +
                        "Sản phẩm '" + tenSp + variant + "' — Kho còn: " + stock + ", cần: " + qty + "."
                    );
                }
            }
        }
        // Bước 2: Tất cả đều đủ kho — tiến hành trừ kho
        for (ChiTietHoaDon ct : details) {
            SanPhamChiTiet spct = ct.getSanPhamChiTiet();
            if (spct != null) {
                int stock = spct.getSoLuongTon() != null ? spct.getSoLuongTon() : 0;
                int qty = ct.getSoLuong() != null ? ct.getSoLuong() : 0;
                spct.setSoLuongTon(stock - qty);
                sanPhamChiTietRepository.save(spct);
                if (spct.getSanPham() != null) {
                    syncTotalQuantity(spct.getSanPham().getId());
                }
            }
        }
    }

    @Transactional
    public void restoreStockForInvoice(Long hoaDonId) {
        List<ChiTietHoaDon> details = chiTietHoaDonRepository.findByHoaDonId(hoaDonId);
        for (ChiTietHoaDon ct : details) {
            SanPhamChiTiet spct = ct.getSanPhamChiTiet();
            if (spct != null) {
                int stock = spct.getSoLuongTon() != null ? spct.getSoLuongTon() : 0;
                int qty = ct.getSoLuong() != null ? ct.getSoLuong() : 0;
                spct.setSoLuongTon(stock + qty);
                sanPhamChiTietRepository.save(spct);
                if (spct.getSanPham() != null) {
                    syncTotalQuantity(spct.getSanPham().getId());
                }
            }
        }
    }

    private void syncTotalQuantity(Long sanPhamId) {
        java.util.Optional<SanPham> spOpt = sanPhamRepository.findById(sanPhamId);
        if (spOpt.isPresent()) {
            SanPham sanPham = spOpt.get();
            List<SanPhamChiTiet> variants = sanPhamChiTietRepository.findBySanPhamId(sanPhamId);
            int totalQuantity = 0;
            java.math.BigDecimal minGiaBan = null;
            java.math.BigDecimal minGiaNhap = null;
            for (SanPhamChiTiet v : variants) {
                if (v.getSoLuongTon() != null) {
                    totalQuantity += v.getSoLuongTon();
                }
                if (v.getGiaBan() != null) {
                    if (minGiaBan == null || v.getGiaBan().compareTo(minGiaBan) < 0) {
                        minGiaBan = v.getGiaBan();
                    }
                }
                if (v.getGiaNhap() != null) {
                    if (minGiaNhap == null || v.getGiaNhap().compareTo(minGiaNhap) < 0) {
                        minGiaNhap = v.getGiaNhap();
                    }
                }
            }
            sanPham.setSoLuong(totalQuantity);
            if (minGiaBan != null) {
                sanPham.setGiaBan(minGiaBan);
            }
            if (minGiaNhap != null) {
                sanPham.setGiaNhap(minGiaNhap);
            }
            sanPhamRepository.save(sanPham);
        }
    }

    /**
     * Xác nhận thanh toán VNPay thành công.
     * Được gọi từ VNPay IPN hoặc Return URL sau khi xác thực chữ ký.
     *
     * @param txnRef      vnp_TxnRef = maHoaDon (mã hóa đơn, dùng để tìm đơn)
     * @param transNo     vnp_TransactionNo từ VNPay
     * @param paidAmount  Số tiền thực tế đã thanh toán (VNĐ)
     */
    @Transactional
    public void confirmVNPayPayment(String txnRef, String transNo, long paidAmount) {
        // Tìm hóa đơn theo mã (maHoaDon)
        HoaDon hd = hoaDonRepository.findAll().stream()
                .filter(h -> txnRef.equals(h.getMaHoaDon()))
                .findFirst()
                .orElse(null);

        // Nếu không tìm được theo mã, thử theo ID
        if (hd == null) {
            try {
                long id = Long.parseLong(txnRef);
                hd = hoaDonRepository.findById(id).orElse(null);
            } catch (NumberFormatException ignored) {}
        }

        if (hd == null) {
            throw new IllegalArgumentException("Không tìm thấy đơn hàng với mã: " + txnRef);
        }

        // Kiểm tra số lượng tồn kho của tất cả sản phẩm trong đơn hàng
        List<ChiTietHoaDon> details = chiTietHoaDonRepository.findByHoaDonId(hd.getId());
        if (details != null && !details.isEmpty()) {
            for (ChiTietHoaDon ct : details) {
                SanPhamChiTiet spct = ct.getSanPhamChiTiet();
                if (spct != null) {
                    spct = sanPhamChiTietRepository.findById(spct.getId()).orElse(spct);
                    int stock = spct.getSoLuongTon() != null ? spct.getSoLuongTon() : 0;
                    int qty = ct.getSoLuong() != null ? ct.getSoLuong() : 0;
                    if (stock < qty) {
                        String tenSp = (spct.getSanPham() != null) ? spct.getSanPham().getTenSanPham() : "Sản phẩm";
                        String mauSac = (spct.getMauSac() != null) ? spct.getMauSac().getTenMauSac() : "";
                        String coGiay = (spct.getCoGiay() != null) ? String.valueOf(spct.getCoGiay().getSizeGiay()) : "";
                        String variant = (!mauSac.isEmpty() || !coGiay.isEmpty())
                                ? " [" + mauSac + ((!mauSac.isEmpty() && !coGiay.isEmpty()) ? " - " : "") + coGiay + "]"
                                : "";

                        // Ghi lịch sử thất bại do thiếu hàng
                        LichSuHoaDon historyFail = LichSuHoaDon.builder()
                                .hoaDon(hd)
                                .hanhDong("VNPay thanh toán thất bại (Không đủ tồn kho)")
                                .ngayTao(LocalDateTime.now())
                                .ghiChu("Giao dịch VNPay " + transNo + " thất bại do sản phẩm '" + tenSp + variant + "' không đủ số lượng trong kho (còn: " + stock + ", cần: " + qty + ")")
                                .build();
                        lichSuHoaDonRepository.save(historyFail);

                        throw new IllegalStateException("Sản phẩm '" + tenSp + variant + "' không đủ số lượng trong kho (kho còn: " + stock + ", cần: " + qty + ")!");
                    }
                }
            }
        }

        // Cập nhật ghi chú & trạng thái thanh toán — KHÔNG tự động chuyển trạng thái đơn hàng
        // (Admin vẫn cần xác nhận và xử lý đơn)
        String currentNote = hd.getGhiChu() != null ? hd.getGhiChu() : "";
        String vnpayNote = " | [VNPAY THANH TOÁN THÀNH CÔNG] Mã GD: " + transNo
                + " | Số tiền: " + paidAmount + " VNĐ lúc " + LocalDateTime.now();
        hd.setGhiChu(currentNote + vnpayNote);

        hoaDonRepository.save(hd);

        // Ghi lịch sử
        LichSuHoaDon history = LichSuHoaDon.builder()
                .hoaDon(hd)
                .hanhDong("VNPay thanh toán thành công")
                .ngayTao(LocalDateTime.now())
                .ghiChu("Mã GD VNPay: " + transNo + " | Số tiền: " + paidAmount + " VNĐ")
                .build();
        lichSuHoaDonRepository.save(history);
    }
}
