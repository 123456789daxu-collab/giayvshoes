package com.example.be.service.impl;

import com.example.be.entity.SanPham;
import com.example.be.repository.SanPhamRepository;
import com.example.be.service.SanPhamService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

@Service
public class SanPhamServiceImpl implements SanPhamService {

    @Autowired
    private SanPhamRepository sanPhamRepository;

    @Override
    public Page<SanPham> search(String keyword, Integer trangThai, Integer soLuongTon, Long idThuongHieu, Long idLoaiGiay, java.math.BigDecimal minPrice, java.math.BigDecimal maxPrice, Pageable pageable) {
        return sanPhamRepository.search(keyword, trangThai, soLuongTon, idThuongHieu, idLoaiGiay, minPrice, maxPrice, pageable);
    }

    @Override
    public SanPham findById(Long id) {
        return sanPhamRepository.findById(id).orElse(null);
    }

    // KHONG DUNG XOA CUNG (SOFT DELETE / TOGGLE STATUS ONLY)
    /*
    @Override
    public void deleteById(Long id) {
        sanPhamRepository.deleteById(id);
    }
    */

    @Override
    public boolean existsByTenSanPham(String tenSanPham) {
        return sanPhamRepository.existsByTenSanPham(tenSanPham);
    }

    @Override
    public SanPham findByTenSanPham(String tenSanPham) {
        return sanPhamRepository.findByTenSanPham(tenSanPham);
    }

    @Autowired
    private com.example.be.service.MaGeneratorService maGeneratorService;

    @Override
    public boolean existsByMaSanPham(String maSanPham) {
        return sanPhamRepository.existsByMaSanPham(maSanPham);
    }

    @Override
    public String generateNextMaSanPham() {
        return maGeneratorService.generateMaSanPham();
    }

    @Override
    public List<SanPham> getAll() {
        return sanPhamRepository.findAll((org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "id")));
    }

    @Override
    public long countTotalProducts() {
        return sanPhamRepository.count();
    }

    @Override
    public long countActiveProducts() {
        return sanPhamRepository.countByTrangThai(1);
    }

    @Override
    public long countInactiveProducts() {
        return sanPhamRepository.countByTrangThai(0);
    }

    @Override
    public Page<SanPham> getPage(int pageNo, int pageSize) {
        Pageable pageable = PageRequest.of(pageNo - 1, pageSize, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "id"));
        return sanPhamRepository.findAll(pageable);
    }

    @Override
    public Page<SanPham> searchFilter(String keyword, Long idThuongHieu, Long idLoaiGiay, Integer trangThai, String sort, int pageNo, int pageSize) {
        org.springframework.data.domain.Sort sortObj = org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "id");
        
        if (sort != null && !sort.isEmpty()) {
            switch (sort) {
                case "name_asc":
                    sortObj = org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "tenSanPham");
                    break;
                case "name_desc":
                    sortObj = org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "tenSanPham");
                    break;
                case "price_asc":
                    sortObj = org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "giaBan");
                    break;
                case "price_desc":
                    sortObj = org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "giaBan");
                    break;
                case "qty_desc":
                    sortObj = org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "soLuong");
                    break;
                case "qty_asc":
                    sortObj = org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "soLuong");
                    break;
                default:
                    sortObj = org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "id");
            }
        }
        
        Pageable pageable = PageRequest.of(pageNo - 1, pageSize, sortObj);
        String kw = (keyword != null && !keyword.trim().isEmpty()) ? keyword.trim() : null;
        return sanPhamRepository.search(kw, trangThai, null, idThuongHieu, idLoaiGiay, null, null, pageable);
    }

    @Override
    public SanPham getById(Long id) {
        return sanPhamRepository.findById(id).orElse(null);
    }

    @Override
    public SanPham save(SanPham sanPham) {
        sanPham.setNgayTao(LocalDateTime.now());
        sanPham.setNgaySua(LocalDateTime.now());
        if(sanPham.getTrangThai() == null) {
            sanPham.setTrangThai(1); // 1 = Kinh doanh
        }
        return sanPhamRepository.save(sanPham);
    }

    @Override
    public SanPham update(Long id, SanPham sanPham) {
        Optional<SanPham> existingOpt = sanPhamRepository.findById(id);
        if(existingOpt.isPresent()) {
            SanPham existing = existingOpt.get();
            if (sanPham.getTenSanPham() == null || sanPham.getTenSanPham().trim().isEmpty()) {
                throw new IllegalArgumentException("Tên sản phẩm không được để trống!");
            }
            String trimmedName = sanPham.getTenSanPham().trim();
            if (!trimmedName.equalsIgnoreCase(existing.getTenSanPham().trim()) && existsByTenSanPham(trimmedName)) {
                throw new IllegalStateException("Tên sản phẩm đã tồn tại trong hệ thống. Vui lòng chọn tên khác!");
            }
            existing.setTenSanPham(trimmedName);
            if (sanPham.getThuongHieu() != null) existing.setThuongHieu(sanPham.getThuongHieu());
            if (sanPham.getChatLieu() != null) existing.setChatLieu(sanPham.getChatLieu());
            if (sanPham.getLoaiGiay() != null) existing.setLoaiGiay(sanPham.getLoaiGiay());
            if (sanPham.getDanhMuc() != null) existing.setDanhMuc(sanPham.getDanhMuc());
            if (sanPham.getGiaNhap() != null) existing.setGiaNhap(sanPham.getGiaNhap());
            if (sanPham.getGiaBan() != null) existing.setGiaBan(sanPham.getGiaBan());
            if (sanPham.getMoTaChiTiet() != null) existing.setMoTaChiTiet(sanPham.getMoTaChiTiet());
            if (sanPham.getTrangThai() != null) existing.setTrangThai(sanPham.getTrangThai());
            existing.setNgaySua(LocalDateTime.now());
            return sanPhamRepository.save(existing);
        }
        return null;
    }

    // KHONG DUNG XOA CUNG (SOFT DELETE / TOGGLE STATUS ONLY)
    /*
    @Override
    public void delete(Long id) {
        sanPhamRepository.deleteById(id);
    }
    */

    @Override
    public void toggleStatus(Long id) {
        Optional<SanPham> existingOpt = sanPhamRepository.findById(id);
        if(existingOpt.isPresent()) {
            SanPham existing = existingOpt.get();
            existing.setTrangThai(existing.getTrangThai() == 1 ? 0 : 1);
            sanPhamRepository.save(existing);
        }
    }

    @Autowired private com.example.be.repository.SanPhamChiTietRepository sanPhamChiTietRepository;
    @Autowired private com.example.be.repository.ChiTietDotGiamGiaRepository chiTietDotGiamGiaRepository;
    @Autowired private com.example.be.repository.MauSacRepository mauSacRepository;
    @Autowired private com.example.be.repository.CoGiayRepository coGiayRepository;
    @Autowired private com.example.be.repository.ThuongHieuRepository thuongHieuRepository;
    @Autowired private com.example.be.repository.ChatLieuRepository chatLieuRepository;
    @Autowired private com.example.be.repository.LoaiGiayRepository loaiGiayRepository;
    @Autowired private com.example.be.repository.DanhMucRepository danhMucRepository;
    @Autowired private com.example.be.repository.DotGiamGiaRepository dotGiamGiaRepository;

    @Override
    public com.example.be.entity.SanPhamChiTiet getVariantById(Long id) {
        return sanPhamChiTietRepository.findById(id).orElse(null);
    }

    @Override
    public Page<com.example.be.entity.SanPhamChiTiet> getVariantsBySanPhamId(Long sanPhamId, Pageable pageable) {
        return sanPhamChiTietRepository.findBySanPhamId(sanPhamId, pageable);
    }

    @Override
    public Page<com.example.be.entity.SanPhamChiTiet> searchVariantsGlobal(String keyword, Pageable pageable) {
        if (keyword != null && !keyword.trim().isEmpty()) {
            return sanPhamChiTietRepository.searchGlobal(keyword.trim(), pageable);
        }
        return sanPhamChiTietRepository.findAll(pageable);
    }

    @Override
    public java.util.Map<String, Object> calculateDiscounts(List<com.example.be.entity.SanPhamChiTiet> variants) {
        java.util.Map<Long, Integer> phanTramGiamMap = new java.util.HashMap<>();
        java.util.Map<Long, java.math.BigDecimal> giaSauGiamMap = new java.util.HashMap<>();
        if (variants != null) {
            for (com.example.be.entity.SanPhamChiTiet spct : variants) {
                Integer phanTramGiam = chiTietDotGiamGiaRepository.findMaxActiveDiscountBySanPhamChiTietId(spct.getId(), LocalDateTime.now());
                if (phanTramGiam != null && phanTramGiam > 0) {
                    phanTramGiamMap.put(spct.getId(), phanTramGiam);
                    if (spct.getGiaBan() != null) {
                        java.math.BigDecimal multiplier = java.math.BigDecimal.valueOf(100 - phanTramGiam)
                                .divide(java.math.BigDecimal.valueOf(100), 10, java.math.RoundingMode.HALF_UP);
                        java.math.BigDecimal giaSauGiam = spct.getGiaBan().multiply(multiplier).setScale(0, java.math.RoundingMode.HALF_UP);
                        giaSauGiamMap.put(spct.getId(), giaSauGiam);
                    }
                }
            }
        }
        return java.util.Map.of("phanTramGiamMap", phanTramGiamMap, "giaSauGiamMap", giaSauGiamMap);
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void updateVariant(Long id, java.math.BigDecimal giaBan, java.math.BigDecimal giaNhap, Integer soLuongTon, Integer trangThai, String imageBase64) {
        com.example.be.entity.SanPhamChiTiet variant = sanPhamChiTietRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy biến thể id=" + id));
        variant.setGiaBan(giaBan);
        if (giaNhap != null) {
            variant.setGiaNhap(giaNhap);
        }
        variant.setSoLuongTon(soLuongTon);
        if (trangThai != null) {
            variant.setTrangThai(trangThai);
        }
        if (imageBase64 != null && !imageBase64.trim().isEmpty()) {
            try {
                List<String> base64List = parseBase64List(imageBase64);
                java.util.List<String> savedUrls = new java.util.ArrayList<>();
                String uploadDir = "src/main/resources/static/upload/";
                for (int i = 0; i < base64List.size(); i++) {
                    String b64 = base64List.get(i);
                    String fileName = "variant_" + variant.getId() + "_" + System.currentTimeMillis() + "_" + i + ".png";
                    String fileUrl = saveBase64File(uploadDir, fileName, b64);
                    savedUrls.add(fileUrl);
                }
                if (!savedUrls.isEmpty()) {
                    variant.setHinhAnh(String.join(",", savedUrls));
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
        sanPhamChiTietRepository.save(variant);
        syncTotalQuantity(variant.getSanPham().getId());
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void toggleStatusVariant(Long id) {
        com.example.be.entity.SanPhamChiTiet variant = sanPhamChiTietRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy biến thể id=" + id));
        variant.setTrangThai(variant.getTrangThai() != null && variant.getTrangThai() == 1 ? 0 : 1);
        sanPhamChiTietRepository.save(variant);
        syncTotalQuantity(variant.getSanPham().getId());
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void saveProductWithVariants(SanPham sanPham, List<Long> variantSizes, List<Long> variantColors, List<Integer> variantQuantities, List<java.math.BigDecimal> variantPrices, List<java.math.BigDecimal> variantImportPrices, List<String> variantImages) {
        if (sanPham.getTenSanPham() == null || sanPham.getTenSanPham().trim().isEmpty()) {
            throw new IllegalArgumentException("Tên sản phẩm không được để trống!");
        }
        sanPham.setTenSanPham(sanPham.getTenSanPham().trim());

        SanPham existingSp = null;
        if (existsByTenSanPham(sanPham.getTenSanPham())) {
            existingSp = findByTenSanPham(sanPham.getTenSanPham());
            boolean match = false;
            if (existingSp != null) {
                if (existingSp.getThuongHieu() != null && sanPham.getThuongHieu() != null && existingSp.getThuongHieu().getId().equals(sanPham.getThuongHieu().getId()) &&
                    existingSp.getDanhMuc() != null && sanPham.getDanhMuc() != null && existingSp.getDanhMuc().getId().equals(sanPham.getDanhMuc().getId()) &&
                    existingSp.getLoaiGiay() != null && sanPham.getLoaiGiay() != null && existingSp.getLoaiGiay().getId().equals(sanPham.getLoaiGiay().getId()) &&
                    existingSp.getChatLieu() != null && sanPham.getChatLieu() != null && existingSp.getChatLieu().getId().equals(sanPham.getChatLieu().getId())) {
                    match = true;
                }
            }
            if (!match) {
                throw new IllegalStateException("Tên sản phẩm đã tồn tại nhưng có phân loại khác. Vui lòng chọn tên khác hoặc chọn đúng phân loại!");
            }
        }

        if (sanPham.getThuongHieu() == null || sanPham.getThuongHieu().getId() == null) {
            throw new IllegalArgumentException("Vui lòng chọn Thương Hiệu!");
        }
        if (sanPham.getChatLieu() == null || sanPham.getChatLieu().getId() == null) {
            throw new IllegalArgumentException("Vui lòng chọn Chất Liệu!");
        }
        if (sanPham.getLoaiGiay() == null || sanPham.getLoaiGiay().getId() == null) {
            throw new IllegalArgumentException("Vui lòng chọn Loại Giày!");
        }
        if (sanPham.getDanhMuc() == null || sanPham.getDanhMuc().getId() == null) {
            throw new IllegalArgumentException("Vui lòng chọn Danh Mục!");
        }
        if (variantSizes == null || variantSizes.isEmpty() || variantColors == null || variantColors.isEmpty()) {
            throw new IllegalArgumentException("Sản phẩm phải có ít nhất 1 biến thể (Màu sắc và Kích cỡ)!");
        }

        SanPham savedSp;
        if (existingSp != null) {
            savedSp = existingSp;
        } else {
            if (sanPham.getMaSanPham() == null || sanPham.getMaSanPham().trim().isEmpty() || "(Tự động sinh)".equals(sanPham.getMaSanPham().trim()) || sanPham.getMaSanPham().contains("Đang tải")) {
                sanPham.setMaSanPham(generateNextMaSanPham());
            }
            sanPham.setNgayTao(LocalDateTime.now());
            if (sanPham.getSoLuong() == null) sanPham.setSoLuong(0);
            if (sanPham.getGiaBan() == null) sanPham.setGiaBan(java.math.BigDecimal.ZERO);
            if (sanPham.getGiaNhap() == null) sanPham.setGiaNhap(java.math.BigDecimal.ZERO);
            savedSp = sanPhamRepository.save(sanPham);
        }

        if (variantSizes != null && variantColors != null) {
            java.util.Map<String, String> base64Cache = new java.util.HashMap<>();
            for (int i = 0; i < variantSizes.size(); i++) {
                com.example.be.entity.SanPhamChiTiet variant = new com.example.be.entity.SanPhamChiTiet();
                variant.setSanPham(savedSp);

                com.example.be.entity.MauSac mau = mauSacRepository.findById(variantColors.get(i)).orElse(null);
                com.example.be.entity.CoGiay size = coGiayRepository.findById(variantSizes.get(i)).orElse(null);
                variant.setMauSac(mau);
                variant.setCoGiay(size);

                variant.setGiaBan(variantPrices.get(i));
                variant.setGiaNhap(variantImportPrices != null && variantImportPrices.size() > i ? variantImportPrices.get(i) : java.math.BigDecimal.ZERO);
                variant.setSoLuongTon(variantQuantities.get(i));
                variant.setTrangThai(sanPham.getTrangThai());
                variant.setMa("CT-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());

                if (variantImages != null && i < variantImages.size()) {
                    String imgData = variantImages.get(i);
                    if (imgData != null && !imgData.trim().isEmpty()) {
                        try {
                            List<String> base64List = parseBase64List(imgData);
                            java.util.List<String> savedUrls = new java.util.ArrayList<>();
                            String uploadDir = "src/main/resources/static/upload/";

                            for (int j = 0; j < base64List.size(); j++) {
                                String b64 = base64List.get(j);
                                if (base64Cache.containsKey(b64)) {
                                    savedUrls.add(base64Cache.get(b64));
                                } else {
                                    String fileName = "sp_" + System.currentTimeMillis() + "_" + i + "_" + j + ".png";
                                    String fileUrl = saveBase64File(uploadDir, fileName, b64);
                                    base64Cache.put(b64, fileUrl);
                                    savedUrls.add(fileUrl);
                                }
                            }
                            if (!savedUrls.isEmpty()) {
                                variant.setHinhAnh(String.join(",", savedUrls));
                            }
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    }
                }
                sanPhamChiTietRepository.save(variant);
            }
        }
        syncTotalQuantity(savedSp.getId());
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void updateVariantFull(Long id, Long idThuongHieu, Long idChatLieu, Long idDanhMuc, Long idLoaiGiay, String moTaChiTiet, Long idMauSac, Long idCoGiay, Double trangLuong, java.math.BigDecimal giaNhap, java.math.BigDecimal giaBan, Integer soLuongTon, Integer trangThai, String imageBase64) {
        com.example.be.entity.SanPhamChiTiet variant = sanPhamChiTietRepository.findById(id).orElse(null);
        if (variant != null) {
            SanPham sanPham = variant.getSanPham();
            if (sanPham != null) {
                sanPham.setThuongHieu(thuongHieuRepository.findById(idThuongHieu).orElse(null));
                sanPham.setChatLieu(chatLieuRepository.findById(idChatLieu).orElse(null));
                sanPham.setDanhMuc(danhMucRepository.findById(idDanhMuc).orElse(null));
                sanPham.setLoaiGiay(loaiGiayRepository.findById(idLoaiGiay).orElse(null));
                sanPham.setMoTaChiTiet(moTaChiTiet);
                sanPhamRepository.save(sanPham);
            }

            variant.setMauSac(mauSacRepository.findById(idMauSac).orElse(null));
            variant.setCoGiay(coGiayRepository.findById(idCoGiay).orElse(null));
            if (trangLuong != null) variant.setTrangLuong(trangLuong);
            if (giaNhap != null) variant.setGiaNhap(giaNhap);
            variant.setGiaBan(giaBan);
            variant.setSoLuongTon(soLuongTon);
            if (trangThai != null) variant.setTrangThai(trangThai);

            if (imageBase64 != null && !imageBase64.trim().isEmpty()) {
                try {
                    List<String> base64List = parseBase64List(imageBase64);
                    List<String> savedUrls = new java.util.ArrayList<>();
                    String uploadDir = "src/main/resources/static/upload/";
                    for (int i = 0; i < base64List.size(); i++) {
                        String b64 = base64List.get(i);
                        String fileName = "variant_full_" + variant.getId() + "_" + System.currentTimeMillis() + "_" + i + ".png";
                        String fileUrl = saveBase64File(uploadDir, fileName, b64);
                        savedUrls.add(fileUrl);
                    }
                    if (!savedUrls.isEmpty()) {
                        String oldHinhAnh = variant.getHinhAnh();
                        if (oldHinhAnh != null && !oldHinhAnh.trim().isEmpty()) {
                            variant.setHinhAnh(oldHinhAnh + "," + String.join(",", savedUrls));
                        } else {
                            variant.setHinhAnh(String.join(",", savedUrls));
                        }
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }

            sanPhamChiTietRepository.save(variant);
            if (variant.getSanPham() != null) {
                syncTotalQuantity(variant.getSanPham().getId());
            }
        }
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public int toggleProductStatus(Long id) {
        SanPham sanPham = findById(id);
        int newStatus = 0;
        if (sanPham != null) {
            Integer currentStatus = sanPham.getTrangThai();
            newStatus = (currentStatus != null && currentStatus == 1) ? 0 : 1;
            sanPham.setTrangThai(newStatus);
            sanPhamRepository.save(sanPham);

            List<com.example.be.entity.SanPhamChiTiet> variants = sanPhamChiTietRepository.findBySanPhamId(id);
            for (com.example.be.entity.SanPhamChiTiet v : variants) {
                v.setTrangThai(newStatus);
                sanPhamChiTietRepository.save(v);
            }
            syncTotalQuantity(id);
        }
        return newStatus;
    }

    @Override
    public void syncMissingPricesAndQuantities() {
        List<SanPham> allProducts = getAll();
        if (allProducts != null) {
            for (SanPham sp : allProducts) {
                if (sp != null && (sp.getGiaBan() == null || sp.getSoLuong() == null)) {
                    syncTotalQuantity(sp.getId());
                }
            }
        }
    }

    @Override
    public byte[] exportExcel(List<SanPham> listSanPham) throws java.io.IOException {
        try (org.apache.poi.ss.usermodel.Workbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook();
             java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream()) {
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Danh sách Sản phẩm");

            org.apache.poi.ss.usermodel.CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);

            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);
            String[] headers = {"STT", "Mã sản phẩm", "Tên sản phẩm", "Thương hiệu", "Giá bán (VNĐ)", "Số lượng", "Trạng thái"};
            for (int i = 0; i < headers.length; i++) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            if (listSanPham != null) {
                for (SanPham sp : listSanPham) {
                    org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIdx);
                    row.createCell(0).setCellValue(rowIdx);
                    row.createCell(1).setCellValue(sp.getMaSanPham() != null ? sp.getMaSanPham() : "");
                    row.createCell(2).setCellValue(sp.getTenSanPham() != null ? sp.getTenSanPham() : "");
                    row.createCell(3).setCellValue(sp.getThuongHieu() != null ? sp.getThuongHieu().getTenThuongHieu() : "");
                    row.createCell(4).setCellValue(sp.getGiaBan() != null ? sp.getGiaBan().doubleValue() : 0);
                    row.createCell(5).setCellValue(sp.getSoLuong() != null ? sp.getSoLuong() : 0);
                    row.createCell(6).setCellValue(sp.getTrangThai() != null && sp.getTrangThai() == 1 ? "Kinh doanh" : "Ngừng kinh doanh");
                    rowIdx++;
                }
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    private List<String> parseBase64List(String str) {
        List<String> list = new java.util.ArrayList<>();
        if (str == null || str.trim().isEmpty()) return list;
        str = str.trim();
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            if (str.startsWith("[")) {
                return mapper.readValue(str, new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
            }
        } catch (Exception ignored) {}
        if (str.startsWith("[")) {
            str = str.substring(1, str.length() - 1).trim();
            String[] tokens = str.split("\",\\s*\"");
            for (String t : tokens) {
                String clean = t.replaceAll("^\"|\"$", "").trim();
                if (!clean.isEmpty()) list.add(clean);
            }
        } else {
            list.add(str);
        }
        return list;
    }

    private String saveBase64File(String uploadDir, String fileName, String base64String) throws java.io.IOException {
        java.nio.file.Path uploadPath = java.nio.file.Paths.get(uploadDir).toAbsolutePath().normalize();
        if (!java.nio.file.Files.exists(uploadPath)) {
            java.nio.file.Files.createDirectories(uploadPath);
        }
        String base64Image = base64String;
        if (base64String.contains(",")) {
            base64Image = base64String.substring(base64String.indexOf(",") + 1);
        }
        base64Image = base64Image.replace(" ", "+");

        byte[] decodedBytes = java.util.Base64.getDecoder().decode(base64Image);
        java.nio.file.Path filePath = uploadPath.resolve(fileName);
        try (java.io.FileOutputStream fos = new java.io.FileOutputStream(filePath.toFile())) {
            fos.write(decodedBytes);
        }

        try {
            java.nio.file.Path targetPath = java.nio.file.Paths.get("target/classes/static/upload/").toAbsolutePath().normalize();
            if (!java.nio.file.Files.exists(targetPath)) {
                java.nio.file.Files.createDirectories(targetPath);
            }
            java.nio.file.Path targetFile = targetPath.resolve(fileName);
            try (java.io.FileOutputStream fos = new java.io.FileOutputStream(targetFile.toFile())) {
                fos.write(decodedBytes);
            }
        } catch (Exception ignored) {}

        return "/upload/" + fileName;
    }

    private void syncTotalQuantity(Long sanPhamId) {
        SanPham sanPham = findById(sanPhamId);
        if (sanPham != null) {
            List<com.example.be.entity.SanPhamChiTiet> variants = sanPhamChiTietRepository.findBySanPhamId(sanPhamId);
            int totalQuantity = 0;
            java.math.BigDecimal minGiaBan = null;
            java.math.BigDecimal minGiaNhap = null;
            for (com.example.be.entity.SanPhamChiTiet v : variants) {
                if (v.getSoLuongTon() != null && v.getTrangThai() != null && v.getTrangThai() == 1) {
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

    private String resolveImageUrl(com.example.be.entity.SanPhamChiTiet s) {
        if (s == null) return null;
        if (s.getDanhSachHinhAnh() != null && !s.getDanhSachHinhAnh().isEmpty()) {
            String first = s.getDanhSachHinhAnh().get(0);
            if (first != null && !first.isBlank()) {
                return first.trim();
            }
        }
        if (s.getHinhAnh() != null && !s.getHinhAnh().isBlank() && !s.getHinhAnh().equals("[]") && !s.getHinhAnh().equals("[\"\"]")) {
            String clean = s.getHinhAnh().replaceAll("[\\[\\]\"]", "").trim();
            if (!clean.isEmpty()) {
                return clean.split("\\s*,\\s*")[0].trim();
            }
        }
        return null;
    }

    private java.util.Map<String, Object> mapVariantToMap(com.example.be.entity.SanPhamChiTiet s) {
        java.util.Map<String, Object> item = new java.util.LinkedHashMap<>();
        item.put("id", s.getId());
        item.put("sanPhamId", s.getSanPham() != null ? s.getSanPham().getId() : null);
        item.put("ma", s.getMa());
        item.put("tenSanPham", s.getSanPham() != null ? s.getSanPham().getTenSanPham() : "Sản phẩm");
        item.put("mauSac", s.getMauSac() != null ? s.getMauSac().getTenMauSac() : "");
        item.put("sizeGiay", s.getCoGiay() != null ? s.getCoGiay().getSizeGiay() : null);
        item.put("soLuongTon", s.getSoLuongTon() != null ? s.getSoLuongTon() : 0);
        item.put("hinhAnh", resolveImageUrl(s));
        item.put("moTa", s.getSanPham() != null ? s.getSanPham().getMoTaChiTiet() : "");
        item.put("trangThai", s.getTrangThai() != null ? s.getTrangThai() : 1);

        Integer phanTramGiam = chiTietDotGiamGiaRepository.findMaxActiveDiscountBySanPhamChiTietId(s.getId(), LocalDateTime.now());
        java.math.BigDecimal giaBanGoc = s.getGiaBan();

        if (phanTramGiam != null && phanTramGiam > 0 && giaBanGoc != null) {
            java.math.BigDecimal multiplier = java.math.BigDecimal.valueOf(100 - phanTramGiam)
                    .divide(java.math.BigDecimal.valueOf(100), 10, java.math.RoundingMode.HALF_UP);
            java.math.BigDecimal giaSauGiam = giaBanGoc.multiply(multiplier).setScale(0, java.math.RoundingMode.HALF_UP);
            item.put("giaBan", giaSauGiam);
            item.put("giaGoc", giaBanGoc);
            item.put("phanTramGiam", phanTramGiam);
        } else {
            item.put("giaBan", giaBanGoc);
            item.put("giaGoc", null);
            item.put("phanTramGiam", null);
        }

        return item;
    }

    @Override
    public java.util.Map<String, Object> getFlashSaleData() {
        List<com.example.be.entity.DotGiamGia> activeCampaigns = dotGiamGiaRepository.findActiveCampaigns();
        List<com.example.be.entity.SanPhamChiTiet> list = sanPhamChiTietRepository.searchForSale(null);
        List<java.util.Map<String, Object>> saleProducts = new java.util.ArrayList<>();

        for (com.example.be.entity.SanPhamChiTiet s : list) {
            Integer phanTramGiam = chiTietDotGiamGiaRepository.findMaxActiveDiscountBySanPhamChiTietId(s.getId(), LocalDateTime.now());
            if (phanTramGiam != null && phanTramGiam > 0) {
                java.math.BigDecimal giaBanGoc = s.getGiaBan();
                java.math.BigDecimal multiplier = java.math.BigDecimal.valueOf(100 - phanTramGiam)
                        .divide(java.math.BigDecimal.valueOf(100), 10, java.math.RoundingMode.HALF_UP);
                java.math.BigDecimal giaSauGiam = giaBanGoc != null
                        ? giaBanGoc.multiply(multiplier).setScale(0, java.math.RoundingMode.HALF_UP)
                        : java.math.BigDecimal.ZERO;

                java.util.Map<String, Object> item = new java.util.LinkedHashMap<>();
                item.put("id", s.getId());
                item.put("ma", s.getMa());
                item.put("tenSanPham", (s.getSanPham() != null) ? s.getSanPham().getTenSanPham() : "Sản phẩm");
                item.put("thuongHieu", (s.getSanPham() != null && s.getSanPham().getThuongHieu() != null) ? s.getSanPham().getThuongHieu().getTenThuongHieu() : "");
                item.put("mauSac", (s.getMauSac() != null) ? s.getMauSac().getTenMauSac() : "");
                item.put("sizeGiay", (s.getCoGiay() != null) ? s.getCoGiay().getSizeGiay() : null);
                item.put("soLuongTon", s.getSoLuongTon() != null ? s.getSoLuongTon() : 0);
                item.put("hinhAnh", resolveImageUrl(s));
                item.put("giaGoc", giaBanGoc);
                item.put("giaBan", giaSauGiam);
                item.put("phanTramGiam", phanTramGiam);

                saleProducts.add(item);
            }
        }

        java.util.Map<String, Object> response = new java.util.LinkedHashMap<>();
        response.put("campaigns", activeCampaigns);
        response.put("products", saleProducts);
        return response;
    }

    @Override
    public List<java.util.Map<String, Object>> checkCartStatus(List<Long> spctIds) {
        List<java.util.Map<String, Object>> result = new java.util.ArrayList<>();
        if (spctIds == null || spctIds.isEmpty()) {
            return result;
        }

        for (Long id : spctIds) {
            Optional<com.example.be.entity.SanPhamChiTiet> opt = sanPhamChiTietRepository.findById(id);
            java.util.Map<String, Object> item = new java.util.LinkedHashMap<>();
            item.put("id", id);

            if (opt.isEmpty()) {
                item.put("isStopped", true);
                item.put("trangThai", 0);
                item.put("soLuongTon", 0);
                item.put("message", "Sản phẩm không còn tồn tại");
            } else {
                com.example.be.entity.SanPhamChiTiet s = opt.get();
                boolean isProductActive = (s.getSanPham() == null || s.getSanPham().getTrangThai() == null || s.getSanPham().getTrangThai() == 1);
                boolean isVariantActive = (s.getTrangThai() != null && s.getTrangThai() == 1);
                boolean isStopped = !isProductActive || !isVariantActive;

                item.put("ma", s.getMa());
                item.put("tenSanPham", s.getSanPham() != null ? s.getSanPham().getTenSanPham() : "Sản phẩm");
                item.put("mauSac", s.getMauSac() != null ? s.getMauSac().getTenMauSac() : "");
                item.put("sizeGiay", s.getCoGiay() != null ? s.getCoGiay().getSizeGiay() : null);
                item.put("soLuongTon", s.getSoLuongTon() != null ? s.getSoLuongTon() : 0);
                item.put("hinhAnh", resolveImageUrl(s));
                item.put("trangThai", s.getTrangThai() != null ? s.getTrangThai() : 1);
                item.put("isStopped", isStopped);

                Integer phanTramGiam = chiTietDotGiamGiaRepository.findMaxActiveDiscountBySanPhamChiTietId(s.getId(), LocalDateTime.now());
                java.math.BigDecimal giaBanGoc = s.getGiaBan();

                if (phanTramGiam != null && phanTramGiam > 0 && giaBanGoc != null) {
                    java.math.BigDecimal multiplier = java.math.BigDecimal.valueOf(100 - phanTramGiam)
                            .divide(java.math.BigDecimal.valueOf(100), 10, java.math.RoundingMode.HALF_UP);
                    java.math.BigDecimal giaSauGiam = giaBanGoc.multiply(multiplier).setScale(0, java.math.RoundingMode.HALF_UP);
                    item.put("giaBan", giaSauGiam);
                    item.put("giaGoc", giaBanGoc);
                    item.put("phanTramGiam", phanTramGiam);
                } else {
                    item.put("giaBan", giaBanGoc);
                    item.put("giaGoc", null);
                    item.put("phanTramGiam", null);
                }
            }
            result.add(item);
        }
        return result;
    }

    @Override
    public List<java.util.Map<String, Object>> searchForSale(String keyword) {
        List<com.example.be.entity.SanPhamChiTiet> list = sanPhamChiTietRepository.searchForSale(
                keyword == null || keyword.isBlank() ? null : keyword.trim()
        );

        List<java.util.Map<String, Object>> result = new java.util.ArrayList<>();
        for (com.example.be.entity.SanPhamChiTiet s : list) {
            java.util.Map<String, Object> item = new java.util.LinkedHashMap<>();
            item.put("id", s.getId());
            item.put("sanPhamId", (s.getSanPham() != null) ? s.getSanPham().getId() : null);
            item.put("ma", s.getMa());
            item.put("tenSanPham", (s.getSanPham() != null) ? s.getSanPham().getTenSanPham() : "Sản phẩm");
            item.put("mauSac", (s.getMauSac() != null) ? s.getMauSac().getTenMauSac() : "");
            item.put("sizeGiay", (s.getCoGiay() != null) ? s.getCoGiay().getSizeGiay() : null);
            item.put("soLuongTon", s.getSoLuongTon() != null ? s.getSoLuongTon() : 0);
            item.put("hinhAnh", resolveImageUrl(s));

            Integer phanTramGiam = chiTietDotGiamGiaRepository.findMaxActiveDiscountBySanPhamChiTietId(s.getId(), LocalDateTime.now());
            java.math.BigDecimal giaBanGoc = s.getGiaBan();

            if (phanTramGiam != null && phanTramGiam > 0 && giaBanGoc != null) {
                java.math.BigDecimal multiplier = java.math.BigDecimal.valueOf(100 - phanTramGiam)
                        .divide(java.math.BigDecimal.valueOf(100), 10, java.math.RoundingMode.HALF_UP);
                java.math.BigDecimal giaSauGiam = giaBanGoc.multiply(multiplier).setScale(0, java.math.RoundingMode.HALF_UP);
                item.put("giaBan", giaSauGiam);
                item.put("giaGoc", giaBanGoc);
                item.put("phanTramGiam", phanTramGiam);
            } else {
                item.put("giaBan", giaBanGoc);
                item.put("giaGoc", null);
                item.put("phanTramGiam", null);
            }

            result.add(item);
        }
        return result;
    }

    @Override
    public java.util.Map<String, Object> getDetailBySpctId(Long spctId) {
        Optional<com.example.be.entity.SanPhamChiTiet> opt = sanPhamChiTietRepository.findById(spctId);
        if (opt.isEmpty()) {
            return null;
        }
        com.example.be.entity.SanPhamChiTiet target = opt.get();
        if (target.getSanPham() == null) {
            throw new IllegalArgumentException("Sản phẩm không có thông tin gốc!");
        }
        Long sanPhamId = target.getSanPham().getId();
        List<com.example.be.entity.SanPhamChiTiet> variants = sanPhamChiTietRepository.findBySanPhamIdActiveOnly(sanPhamId);

        if ((target.getTrangThai() != null && target.getTrangThai() != 1) && !variants.isEmpty()) {
            target = variants.get(0);
        }

        java.util.Map<String, Object> response = new java.util.LinkedHashMap<>();
        response.put("target", mapVariantToMap(target));

        List<java.util.Map<String, Object>> variantList = new java.util.ArrayList<>();
        for (com.example.be.entity.SanPhamChiTiet v : variants) {
            variantList.add(mapVariantToMap(v));
        }
        response.put("variants", variantList);
        return response;
    }

    @Override
    @Transactional
    public java.util.Map<String, Object> reduceStock(Long id, Integer quantity) {
        Optional<com.example.be.entity.SanPhamChiTiet> opt = sanPhamChiTietRepository.findById(id);
        if (opt.isEmpty()) {
            return null;
        }
        com.example.be.entity.SanPhamChiTiet spct = opt.get();
        if (spct.getTrangThai() != null && spct.getTrangThai() != 1) {
            throw new IllegalStateException("Sản phẩm này đã ngừng kinh doanh!");
        }
        int stock = spct.getSoLuongTon() != null ? spct.getSoLuongTon() : 0;
        if (stock < quantity) {
            throw new IllegalArgumentException("Số lượng trong kho không đủ để bán!");
        }
        return java.util.Map.of("success", true, "newStock", spct.getSoLuongTon());
    }

    @Override
    @Transactional
    public java.util.Map<String, Object> increaseStock(Long id, Integer quantity) {
        Optional<com.example.be.entity.SanPhamChiTiet> opt = sanPhamChiTietRepository.findById(id);
        if (opt.isEmpty()) {
            return null;
        }
        com.example.be.entity.SanPhamChiTiet spct = opt.get();
        int stock = spct.getSoLuongTon() != null ? spct.getSoLuongTon() : 0;
        spct.setSoLuongTon(stock + quantity);
        sanPhamChiTietRepository.save(spct);

        if (spct.getSanPham() != null) {
            syncTotalQuantity(spct.getSanPham().getId());
        }

        return java.util.Map.of("success", true, "newStock", spct.getSoLuongTon());
    }
}
