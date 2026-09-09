package com.example.be.controller;

import com.example.be.entity.SanPham;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.List;

@Controller
@RequestMapping("/san-pham")
public class SanPhamController {

    @Autowired
    private com.example.be.service.SanPhamService sanPhamService;

    @Autowired
    private com.example.be.repository.SanPhamChiTietRepository sanPhamChiTietRepository;

    @Autowired
    private com.example.be.repository.ThuongHieuRepository thuongHieuRepository;

    @Autowired
    private com.example.be.repository.ChatLieuRepository chatLieuRepository;

    @Autowired
    private com.example.be.repository.LoaiGiayRepository loaiGiayRepository;

    @Autowired
    private com.example.be.repository.DanhMucRepository danhMucRepository;

    @Autowired
    private com.example.be.repository.MauSacRepository mauSacRepository;

    @Autowired
    private com.example.be.repository.CoGiayRepository coGiayRepository;

    @Autowired
    private com.example.be.repository.ChiTietDotGiamGiaRepository chiTietDotGiamGiaRepository;

    @GetMapping("/edit/{id}")
    public String edit(@PathVariable Long id, 
                       @RequestParam(defaultValue = "0") int page,
                       @RequestParam(defaultValue = "5") int size,
                       Model model) {
        SanPham sanPham = sanPhamService.findById(id);
        if (sanPham == null) {
            return "redirect:/san-pham";
        }
        Page<com.example.be.entity.SanPhamChiTiet> pageData = sanPhamChiTietRepository.findBySanPhamId(id, PageRequest.of(page, size));
        
        java.util.Map<Long, Integer> phanTramGiamMap = new java.util.HashMap<>();
        java.util.Map<Long, java.math.BigDecimal> giaSauGiamMap = new java.util.HashMap<>();
        for (com.example.be.entity.SanPhamChiTiet spct : pageData.getContent()) {
            Integer phanTramGiam = chiTietDotGiamGiaRepository.findMaxActiveDiscountBySanPhamChiTietId(spct.getId(), java.time.LocalDateTime.now());
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
        
        model.addAttribute("sanPham", sanPham);
        model.addAttribute("pageData", pageData);
        model.addAttribute("phanTramGiamMap", phanTramGiamMap);
        model.addAttribute("giaSauGiamMap", giaSauGiamMap);
        model.addAttribute("listThuongHieu", thuongHieuRepository.findAll());
        model.addAttribute("listChatLieu", chatLieuRepository.findAll());
        model.addAttribute("listLoaiGiay", loaiGiayRepository.findAll());
        model.addAttribute("listDanhMuc", danhMucRepository.findAll());
        model.addAttribute("listMauSac", mauSacRepository.findAll());
        model.addAttribute("listCoGiay", coGiayRepository.findAll());
        
        return "chi-tiet-san-pham";
    }

    @PostMapping("/update-variant/{id}")
    public String updateVariant(@PathVariable Long id, 
                                @RequestParam java.math.BigDecimal giaBan,
                                @RequestParam(required = false) java.math.BigDecimal giaNhap,
                                @RequestParam Integer soLuongTon,
                                @RequestParam(required = false) Integer trangThai,
                                @RequestParam(value = "imageBase64", required = false) String imageBase64,
                                @org.springframework.web.bind.annotation.RequestHeader(value = "Referer", required = false) String referer,
                                RedirectAttributes redirectAttributes) {
        com.example.be.entity.SanPhamChiTiet variant = sanPhamChiTietRepository.findById(id).orElse(null);
        if (variant != null) {
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
                    java.util.List<String> base64List = parseBase64List(imageBase64);
                    java.util.List<String> savedUrls = new java.util.ArrayList<>();
                    String uploadDir = "src/main/resources/static/upload/";
                    
                    for (int i = 0; i < base64List.size(); i++) {
                        String b64 = base64List.get(i);
                        String fileName = "variant_" + variant.getId() + "_" + System.currentTimeMillis() + "_" + i + ".png";
                        String fileUrl = saveBase64File(uploadDir, fileName, b64);
                        savedUrls.add(fileUrl);
                    }
                    
                    // Join URLs with comma
                    if (!savedUrls.isEmpty()) {
                        variant.setHinhAnh(String.join(",", savedUrls));
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }

            sanPhamChiTietRepository.save(variant);
            syncTotalQuantity(variant.getSanPham().getId());
            redirectAttributes.addFlashAttribute("successMessage", "Cập nhật thành công!");
            if (referer != null && !referer.isEmpty()) {
                return "redirect:" + referer;
            }
            return "redirect:/san-pham/edit/" + variant.getSanPham().getId();
        }
        return "redirect:/san-pham";
    }

    @GetMapping("/toggle-status-variant/{id}")
    public String toggleStatusVariant(@PathVariable Long id, 
                                      @org.springframework.web.bind.annotation.RequestHeader(value = "Referer", required = false) String referer,
                                      RedirectAttributes redirectAttributes) {
        com.example.be.entity.SanPhamChiTiet variant = sanPhamChiTietRepository.findById(id).orElse(null);
        if (variant != null) {
            variant.setTrangThai(variant.getTrangThai() != null && variant.getTrangThai() == 1 ? 0 : 1);
            sanPhamChiTietRepository.save(variant);
            syncTotalQuantity(variant.getSanPham().getId());
            redirectAttributes.addFlashAttribute("successMessage", "Thay đổi trạng thái thành công!");
            if (referer != null && !referer.isEmpty()) {
                return "redirect:" + referer;
            }
            return "redirect:/san-pham/edit/" + variant.getSanPham().getId();
        }
        return "redirect:/san-pham";
    }

    @GetMapping("/delete-variant/{id}")
    public String deleteVariant(@PathVariable Long id, 
                                @org.springframework.web.bind.annotation.RequestHeader(value = "Referer", required = false) String referer,
                                RedirectAttributes redirectAttributes) {
        com.example.be.entity.SanPhamChiTiet variant = sanPhamChiTietRepository.findById(id).orElse(null);
        if (variant != null) {
            Long sanPhamId = variant.getSanPham().getId();
            try {
                sanPhamChiTietRepository.deleteById(id);
                syncTotalQuantity(sanPhamId);
                redirectAttributes.addFlashAttribute("successMessage", "Xóa biến thể thành công!");
            } catch (org.springframework.dao.DataIntegrityViolationException e) {
                redirectAttributes.addFlashAttribute("errorMessage", "Không thể xóa biến thể này vì đã có hóa đơn. Vui lòng chuyển trạng thái sang Ngừng Kinh Doanh.");
            }
            if (referer != null && !referer.isEmpty()) {
                return "redirect:" + referer;
            }
            return "redirect:/san-pham/edit/" + sanPhamId;
        }
        return "redirect:/san-pham";
    }

    @GetMapping("/chi-tiet-global")
    public String chiTietGlobal(Model model, 
                                @RequestParam(required = false) String keyword,
                                @RequestParam(required = false) Long sanPhamId,
                                @RequestParam(defaultValue = "0") int page,
                                @RequestParam(defaultValue = "5") int size) {
        Pageable pageable = PageRequest.of(page, size, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "id"));
        Page<com.example.be.entity.SanPhamChiTiet> pageData;
        if (sanPhamId != null) {
            pageData = sanPhamChiTietRepository.findBySanPhamId(sanPhamId, pageable);
        } else if (keyword != null && !keyword.trim().isEmpty()) {
            pageData = sanPhamChiTietRepository.searchGlobal(keyword.trim(), pageable);
        } else {
            pageData = sanPhamChiTietRepository.findAll(pageable);
        }
        
        java.util.Map<Long, Integer> phanTramGiamMap = new java.util.HashMap<>();
        java.util.Map<Long, java.math.BigDecimal> giaSauGiamMap = new java.util.HashMap<>();
        for (com.example.be.entity.SanPhamChiTiet spct : pageData.getContent()) {
            Integer phanTramGiam = chiTietDotGiamGiaRepository.findMaxActiveDiscountBySanPhamChiTietId(spct.getId(), java.time.LocalDateTime.now());
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
        
        model.addAttribute("pageData", pageData);
        model.addAttribute("phanTramGiamMap", phanTramGiamMap);
        model.addAttribute("giaSauGiamMap", giaSauGiamMap);
        model.addAttribute("keyword", keyword);
        model.addAttribute("sanPhamId", sanPhamId);
        model.addAttribute("listThuongHieu", thuongHieuRepository.findAll());
        model.addAttribute("listChatLieu", chatLieuRepository.findAll());
        model.addAttribute("listLoaiGiay", loaiGiayRepository.findAll());
        model.addAttribute("listDanhMuc", danhMucRepository.findAll());
        model.addAttribute("listMauSac", mauSacRepository.findAll());
        model.addAttribute("listCoGiay", coGiayRepository.findAll());
        
        return "san-pham-chi-tiet-global";
    }

    @GetMapping("/variant-detail/{id}")
    public String variantDetail(@PathVariable Long id, Model model) {
        com.example.be.entity.SanPhamChiTiet variant = sanPhamChiTietRepository.findById(id).orElse(null);
        if (variant != null) {
            model.addAttribute("ct", variant);
            model.addAttribute("listThuongHieu", thuongHieuRepository.findAll());
            model.addAttribute("listChatLieu", chatLieuRepository.findAll());
            model.addAttribute("listDanhMuc", danhMucRepository.findAll());
            model.addAttribute("listLoaiGiay", loaiGiayRepository.findAll());
            model.addAttribute("listMauSac", mauSacRepository.findAll());
            model.addAttribute("listCoGiay", coGiayRepository.findAll());
            return "view-san-pham-chi-tiet";
        }
        return "redirect:/san-pham";
    }

    @PostMapping("/update-variant-full/{id}")
    public String updateVariantFull(@PathVariable Long id,
                                    @RequestParam Long idThuongHieu,
                                    @RequestParam Long idChatLieu,
                                    @RequestParam Long idDanhMuc,
                                    @RequestParam Long idLoaiGiay,
                                    @RequestParam String moTaChiTiet,
                                    @RequestParam Long idMauSac,
                                    @RequestParam Long idCoGiay,
                                    @RequestParam(required = false) Double trangLuong,
                                    @RequestParam(required = false) java.math.BigDecimal giaNhap,
                                    @RequestParam java.math.BigDecimal giaBan,
                                    @RequestParam Integer soLuongTon,
                                    @RequestParam(required = false) Integer trangThai,
                                    @RequestParam(value = "imageBase64", required = false) String imageBase64,
                                    RedirectAttributes redirectAttributes) {
        com.example.be.entity.SanPhamChiTiet variant = sanPhamChiTietRepository.findById(id).orElse(null);
        if (variant != null) {
            com.example.be.entity.SanPham sanPham = variant.getSanPham();
            
            // Update the parent SanPham directly
            sanPham.setThuongHieu(thuongHieuRepository.findById(idThuongHieu).orElse(null));
            sanPham.setChatLieu(chatLieuRepository.findById(idChatLieu).orElse(null));
            sanPham.setDanhMuc(danhMucRepository.findById(idDanhMuc).orElse(null));
            sanPham.setLoaiGiay(loaiGiayRepository.findById(idLoaiGiay).orElse(null));
            sanPham.setMoTaChiTiet(moTaChiTiet);
            sanPhamService.save(sanPham);

            // Update Variant
            variant.setMauSac(mauSacRepository.findById(idMauSac).orElse(null));
            variant.setCoGiay(coGiayRepository.findById(idCoGiay).orElse(null));
            if (trangLuong != null) {
                variant.setTrangLuong(trangLuong);
            }
            if (giaNhap != null) {
                variant.setGiaNhap(giaNhap);
            }
            variant.setGiaBan(giaBan);
            variant.setSoLuongTon(soLuongTon);
            if (trangThai != null) {
                variant.setTrangThai(trangThai);
            }

            // Handle Image Upload
            if (imageBase64 != null && !imageBase64.trim().isEmpty()) {
                try {
                    java.util.List<String> base64List = parseBase64List(imageBase64);
                    java.util.List<String> savedUrls = new java.util.ArrayList<>();
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
            syncTotalQuantity(variant.getSanPham().getId());
            redirectAttributes.addFlashAttribute("successMessage", "Cập nhật biến thể thành công!");
            return "redirect:/san-pham/edit/" + variant.getSanPham().getId();
        }
        return "redirect:/san-pham";
    }

    @GetMapping
    public String index(Model model, 
                        @RequestParam(required = false) String keyword,
                        @RequestParam(required = false) Integer trangThai,
                        @RequestParam(required = false) Integer soLuongTon,
                        @RequestParam(required = false) Long idThuongHieu,
                        @RequestParam(required = false) Long idLoaiGiay,
                        @RequestParam(required = false) java.math.BigDecimal minPrice,
                        @RequestParam(required = false) java.math.BigDecimal maxPrice,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "5") int size,
                        @RequestParam(required = false, defaultValue = "price_asc") String sort) {
        
        // Sync any products with missing price/quantity
        java.util.List<SanPham> allProducts = sanPhamService.getAll();
        if (allProducts != null) {
            for (SanPham sp : allProducts) {
                if (sp != null && (sp.getGiaBan() == null || sp.getSoLuong() == null)) {
                    syncTotalQuantity(sp.getId());
                }
            }
        }
        
        // Handle sorting
        org.springframework.data.domain.Sort sortObj = org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "giaBan");
        if (sort != null && !sort.isEmpty()) {
            switch (sort) {
                case "name_asc": sortObj = org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "tenSanPham"); break;
                case "name_desc": sortObj = org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "tenSanPham"); break;
                case "price_asc": sortObj = org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "giaBan"); break;
                case "price_desc": sortObj = org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "giaBan"); break;
                case "qty_asc": sortObj = org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "soLuong"); break;
                case "qty_desc": sortObj = org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "soLuong"); break;
                case "id_desc": sortObj = org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "id"); break;
            }
        }
        
        Pageable pageable = PageRequest.of(page > 0 ? page - 1 : 0, size, sortObj);
        
        Page<SanPham> pageData = sanPhamService.search(keyword, trangThai, soLuongTon, idThuongHieu, idLoaiGiay, minPrice, maxPrice, pageable);
        
        // Provide both pageData and individual pagination variables
        model.addAttribute("pageData", pageData);
        model.addAttribute("listSanPham", pageData.getContent());
        model.addAttribute("currentPage", page > 0 ? page : 1);
        model.addAttribute("totalPages", pageData.getTotalPages());
        model.addAttribute("totalItems", pageData.getTotalElements());
        
        // Stats
        if (allProducts == null) allProducts = new java.util.ArrayList<>();
        long totalProducts = allProducts.size();
        long activeProducts = allProducts.stream().filter(sp -> sp != null && sp.getTrangThai() != null && sp.getTrangThai() == 1).count();
        long inactiveProducts = allProducts.stream().filter(sp -> sp != null && (sp.getTrangThai() == null || sp.getTrangThai() == 0)).count();
        
        model.addAttribute("totalProducts", totalProducts);
        model.addAttribute("activeProducts", activeProducts);
        model.addAttribute("inactiveProducts", inactiveProducts);
        
        model.addAttribute("keyword", keyword);
        model.addAttribute("trangThai", trangThai);
        model.addAttribute("soLuongTon", soLuongTon);
        model.addAttribute("idThuongHieu", idThuongHieu);
        model.addAttribute("idLoaiGiay", idLoaiGiay);
        model.addAttribute("minPrice", minPrice);
        model.addAttribute("maxPrice", maxPrice);
        model.addAttribute("sort", sort);
        
        // Thêm các danh sách thuộc tính để hiển thị trên Dropdown của Modal Tạo Sản Phẩm
        model.addAttribute("listThuongHieu", thuongHieuRepository.findAll());
        model.addAttribute("listChatLieu", chatLieuRepository.findAll());
        model.addAttribute("listLoaiGiay", loaiGiayRepository.findAll());
        model.addAttribute("listDanhMuc", danhMucRepository.findAll());
        model.addAttribute("listMauSac", mauSacRepository.findAll());
        model.addAttribute("listCoGiay", coGiayRepository.findAll());
        
        return "san-pham";
    }

    @GetMapping("/export/excel")
    public org.springframework.http.ResponseEntity<?> exportExcel(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer trangThai,
            @RequestParam(required = false) Integer soLuongTon,
            @RequestParam(required = false) Long idThuongHieu,
            @RequestParam(required = false) Long idLoaiGiay,
            @RequestParam(required = false) java.math.BigDecimal minPrice,
            @RequestParam(required = false) java.math.BigDecimal maxPrice,
            @RequestParam(required = false, defaultValue = "price_asc") String sort) {
        try {
            org.springframework.data.domain.Sort sortObj = org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "giaBan");
            if (sort != null && !sort.isEmpty()) {
                switch (sort) {
                    case "name_asc": sortObj = org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "tenSanPham"); break;
                    case "name_desc": sortObj = org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "tenSanPham"); break;
                    case "price_asc": sortObj = org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "giaBan"); break;
                    case "price_desc": sortObj = org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "giaBan"); break;
                    case "qty_asc": sortObj = org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "soLuong"); break;
                    case "qty_desc": sortObj = org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "soLuong"); break;
                    case "id_desc": sortObj = org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "id"); break;
                }
            }
            Pageable pageable = PageRequest.of(0, 10000, sortObj);
            Page<SanPham> pageData = sanPhamService.search(keyword, trangThai, soLuongTon, idThuongHieu, idLoaiGiay, minPrice, maxPrice, pageable);
            
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
                for (SanPham sp : pageData.getContent()) {
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

                for (int i = 0; i < headers.length; i++) {
                    sheet.autoSizeColumn(i);
                }

                workbook.write(out);
                byte[] bytes = out.toByteArray();

                return org.springframework.http.ResponseEntity.ok()
                        .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=Danh_sach_san_pham.xlsx")
                        .contentType(org.springframework.http.MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                        .body(bytes);
            }
        } catch (Exception e) {
            return org.springframework.http.ResponseEntity.badRequest().body("Lỗi xuất Excel: " + e.getMessage());
        }
    }

    @GetMapping("/api/check-name")
    @ResponseBody
    public java.util.Map<String, Boolean> checkName(@RequestParam String name) {
        boolean exists = sanPhamService.existsByTenSanPham(name.trim());
        java.util.Map<String, Boolean> response = new java.util.HashMap<>();
        response.put("exists", exists);
        return response;
    }

    @GetMapping("/api/next-code")
    @ResponseBody
    public java.util.Map<String, String> getNextCode() {
        return java.util.Map.of("code", sanPhamService.generateNextMaSanPham());
    }

    @GetMapping("/create")
    public String createPage(Model model) {
        model.addAttribute("nextMaSanPham", sanPhamService.generateNextMaSanPham());
        model.addAttribute("listThuongHieu", thuongHieuRepository.findAll().stream().filter(x -> Boolean.TRUE.equals(x.getTrangThai())).collect(java.util.stream.Collectors.toList()));
        model.addAttribute("listChatLieu", chatLieuRepository.findAll().stream().filter(x -> Boolean.TRUE.equals(x.getTrangThai())).collect(java.util.stream.Collectors.toList()));
        model.addAttribute("listLoaiGiay", loaiGiayRepository.findAll().stream().filter(x -> Boolean.TRUE.equals(x.getTrangThai())).collect(java.util.stream.Collectors.toList()));
        model.addAttribute("listDanhMuc", danhMucRepository.findAll().stream().filter(x -> Boolean.TRUE.equals(x.getTrangThai())).collect(java.util.stream.Collectors.toList()));
        model.addAttribute("listMauSac", mauSacRepository.findAll().stream().filter(x -> Boolean.TRUE.equals(x.getTrangThai())).collect(java.util.stream.Collectors.toList()));
        model.addAttribute("listCoGiay", coGiayRepository.findAll().stream().filter(x -> Boolean.TRUE.equals(x.getTrangThai())).collect(java.util.stream.Collectors.toList()));
        return "add-san-pham";
    }

    @PostMapping("/save-all")
    public String saveAll(@ModelAttribute SanPham sanPham,
                          @RequestParam(value = "variantSizes", required = false) List<Long> variantSizes,
                          @RequestParam(value = "variantColors", required = false) List<Long> variantColors,
                          @RequestParam(value = "variantQuantities", required = false) List<Integer> variantQuantities,
                          @RequestParam(value = "variantPrices", required = false) List<java.math.BigDecimal> variantPrices,
                          @RequestParam(value = "variantImportPrices", required = false) List<java.math.BigDecimal> variantImportPrices,
                          @RequestParam(value = "variantImages", required = false) List<String> variantImages,
                          RedirectAttributes redirectAttributes) {
        
        if (sanPham.getTenSanPham() == null || sanPham.getTenSanPham().trim().isEmpty()) {
            redirectAttributes.addFlashAttribute("errorMessage", "Tên sản phẩm không được để trống!");
            return "redirect:/san-pham/create";
        }

        sanPham.setTenSanPham(sanPham.getTenSanPham().trim());

        SanPham existingSp = null;
        if (sanPhamService.existsByTenSanPham(sanPham.getTenSanPham())) {
            existingSp = sanPhamService.findByTenSanPham(sanPham.getTenSanPham());
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
                redirectAttributes.addFlashAttribute("errorMessage", "Tên sản phẩm đã tồn tại nhưng có phân loại khác. Vui lòng chọn tên khác hoặc chọn đúng phân loại!");
                return "redirect:/san-pham/create";
            }
        }

        if (sanPham.getThuongHieu() == null || sanPham.getThuongHieu().getId() == null) {
            redirectAttributes.addFlashAttribute("errorMessage", "Vui lòng chọn Thương Hiệu!");
            return "redirect:/san-pham/create";
        }
        if (sanPham.getChatLieu() == null || sanPham.getChatLieu().getId() == null) {
            redirectAttributes.addFlashAttribute("errorMessage", "Vui lòng chọn Chất Liệu!");
            return "redirect:/san-pham/create";
        }
        if (sanPham.getLoaiGiay() == null || sanPham.getLoaiGiay().getId() == null) {
            redirectAttributes.addFlashAttribute("errorMessage", "Vui lòng chọn Loại Giày!");
            return "redirect:/san-pham/create";
        }
        if (sanPham.getDanhMuc() == null || sanPham.getDanhMuc().getId() == null) {
            redirectAttributes.addFlashAttribute("errorMessage", "Vui lòng chọn Danh Mục!");
            return "redirect:/san-pham/create";
        }

        if (variantSizes == null || variantSizes.isEmpty() || variantColors == null || variantColors.isEmpty()) {
            redirectAttributes.addFlashAttribute("errorMessage", "Sản phẩm phải có ít nhất 1 biến thể (Màu sắc và Kích cỡ)!");
            return "redirect:/san-pham/create";
        }

        try {
            SanPham savedSp;
            if (existingSp != null) {
                savedSp = existingSp;
            } else {
                if (sanPham.getMaSanPham() == null || sanPham.getMaSanPham().trim().isEmpty() || "(Tự động sinh)".equals(sanPham.getMaSanPham().trim()) || sanPham.getMaSanPham().contains("Đang tải")) {
                    sanPham.setMaSanPham(sanPhamService.generateNextMaSanPham());
                }
                sanPham.setNgayTao(java.time.LocalDateTime.now());
                if (sanPham.getSoLuong() == null) sanPham.setSoLuong(0);
                if (sanPham.getGiaBan() == null) sanPham.setGiaBan(java.math.BigDecimal.ZERO);
                if (sanPham.getGiaNhap() == null) sanPham.setGiaNhap(java.math.BigDecimal.ZERO);
                savedSp = sanPhamService.save(sanPham);
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
                                java.util.List<String> base64List = parseBase64List(imgData);
                                java.util.List<String> savedUrls = new java.util.ArrayList<>();
                                String uploadDir = "src/main/resources/static/upload/";
                                
                                for (int j = 0; j < base64List.size(); j++) {
                                    String b64 = base64List.get(j);
                                    if (b64.startsWith("http://") || b64.startsWith("https://") || b64.startsWith("/upload/") || b64.startsWith("/images/")) {
                                        savedUrls.add(b64);
                                    } else if (base64Cache.containsKey(b64)) {
                                        savedUrls.add(base64Cache.get(b64));
                                    } else {
                                        String fileName = "variant_" + savedSp.getId() + "_" + i + "_" + System.currentTimeMillis() + "_" + j + ".png";
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
                syncTotalQuantity(savedSp.getId());
            }
            
            if (existingSp != null) {
                redirectAttributes.addFlashAttribute("successMessage", "Đã thêm các biến thể mới vào sản phẩm đã tồn tại thành công!");
            } else {
                redirectAttributes.addFlashAttribute("successMessage", "Thêm sản phẩm thành công!");
            }
            return "redirect:/san-pham";
        } catch (Exception ex) {
            redirectAttributes.addFlashAttribute("errorMessage", "Lỗi: " + ex.getMessage());
            return "redirect:/san-pham";
        }
    }

    @PostMapping("/update/{id}")
    public String update(@PathVariable Long id, @ModelAttribute SanPham sanPham, RedirectAttributes redirectAttributes) {
        SanPham existing = sanPhamService.findById(id);
        if(existing != null) {
            
            if (sanPham.getTenSanPham() == null || sanPham.getTenSanPham().trim().isEmpty()) {
                redirectAttributes.addFlashAttribute("errorMessage", "Tên sản phẩm không được để trống!");
                return "redirect:/san-pham";
            }
            
            sanPham.setTenSanPham(sanPham.getTenSanPham().trim());

            if (!sanPham.getTenSanPham().equalsIgnoreCase(existing.getTenSanPham().trim()) && sanPhamService.existsByTenSanPham(sanPham.getTenSanPham())) {
                redirectAttributes.addFlashAttribute("errorMessage", "Tên sản phẩm đã tồn tại trong hệ thống. Vui lòng chọn tên khác!");
                return "redirect:/san-pham";
            }

            sanPham.setId(id);
            sanPham.setNgayTao(existing.getNgayTao());
            // Bảo toàn mã sản phẩm và số lượng (vì form update không gửi lên)
            if (sanPham.getMaSanPham() == null || sanPham.getMaSanPham().isEmpty()) {
                sanPham.setMaSanPham(existing.getMaSanPham());
            }
            if (sanPham.getSoLuong() == null) {
                sanPham.setSoLuong(existing.getSoLuong());
            }
            sanPhamService.save(sanPham);
            redirectAttributes.addFlashAttribute("successMessage", "Cập nhật sản phẩm thành công");
        }
        return "redirect:/san-pham";
    }

    @GetMapping("/delete/{id}")
    public String delete(@PathVariable Long id, RedirectAttributes redirectAttributes) {
        try {
            sanPhamService.deleteById(id);
            redirectAttributes.addFlashAttribute("successMessage", "Xóa sản phẩm thành công");
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Không thể xóa sản phẩm này vì đã có dữ liệu liên quan (các biến thể hoặc hóa đơn). Vui lòng chuyển trạng thái sang Ngừng kinh doanh thay vì xóa.");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Đã xảy ra lỗi khi xóa: " + e.getMessage());
        }
        return "redirect:/san-pham";
    }

    @GetMapping("/toggle-status/{id}")
    public String toggleStatus(@PathVariable Long id, 
                               @org.springframework.web.bind.annotation.RequestHeader(value = "Referer", required = false) String referer,
                               RedirectAttributes redirectAttributes) {
        SanPham sanPham = sanPhamService.findById(id);
        if (sanPham != null) {
            Integer currentStatus = sanPham.getTrangThai();
            int newStatus = (currentStatus != null && currentStatus == 1) ? 0 : 1;
            sanPham.setTrangThai(newStatus);
            sanPhamService.save(sanPham);
            
            // Cập nhật trạng thái cho tất cả biến thể của sản phẩm này
            java.util.List<com.example.be.entity.SanPhamChiTiet> variants = sanPhamChiTietRepository.findBySanPhamId(id);
            for (com.example.be.entity.SanPhamChiTiet v : variants) {
                v.setTrangThai(newStatus);
                sanPhamChiTietRepository.save(v);
            }
            syncTotalQuantity(id);
            
            String statusText = (newStatus == 1) ? "Kinh doanh" : "Ngừng kinh doanh";
            redirectAttributes.addFlashAttribute("successMessage", "Đã đổi trạng thái sản phẩm sang: " + statusText);
        }
        if (referer != null && !referer.isEmpty()) {
            return "redirect:" + referer;
        }
        return "redirect:/san-pham";
    }

    private java.util.List<String> parseBase64List(String input) {
        java.util.List<String> list = new java.util.ArrayList<>();
        if (input == null || input.trim().isEmpty()) return list;
        String str = input.trim();
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            if (str.startsWith("[")) {
                return mapper.readValue(str, new com.fasterxml.jackson.core.type.TypeReference<java.util.List<String>>() {});
            }
        } catch (Exception ignored) {
        }
        if (str.startsWith("[")) {
            str = str.substring(1, str.length() - 1).trim();
            String[] tokens = str.split("\",\\s*\"");
            for (String t : tokens) {
                String clean = t.replaceAll("^\"|\"$", "").trim();
                if (!clean.isEmpty()) {
                    list.add(clean);
                }
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
        // Khi gửi qua form application/x-www-form-urlencoded, ký tự '+' trong Base64 bị giải mã thành dấu cách ' '
        base64Image = base64Image.replace(" ", "+");

        byte[] decodedBytes = java.util.Base64.getDecoder().decode(base64Image);
        java.nio.file.Path filePath = uploadPath.resolve(fileName);
        try (java.io.FileOutputStream fos = new java.io.FileOutputStream(filePath.toFile())) {
            fos.write(decodedBytes);
        }

        // Lưu đồng thời vào target/classes/static/upload/ để server Spring Boot đang chạy truy cập được ảnh ngay lập tức
        try {
            java.nio.file.Path targetPath = java.nio.file.Paths.get("target/classes/static/upload/").toAbsolutePath().normalize();
            if (!java.nio.file.Files.exists(targetPath)) {
                java.nio.file.Files.createDirectories(targetPath);
            }
            java.nio.file.Path targetFile = targetPath.resolve(fileName);
            try (java.io.FileOutputStream fos = new java.io.FileOutputStream(targetFile.toFile())) {
                fos.write(decodedBytes);
            }
        } catch (Exception ignored) {
        }

        return "/upload/" + fileName;
    }

    private void syncTotalQuantity(Long sanPhamId) {
        SanPham sanPham = sanPhamService.findById(sanPhamId);
        if (sanPham != null) {
            java.util.List<com.example.be.entity.SanPhamChiTiet> variants = sanPhamChiTietRepository.findBySanPhamId(sanPhamId);
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
            sanPhamService.save(sanPham);
        }
    }
}
