package com.example.be.controller;

import com.example.be.entity.SanPham;
import com.example.be.repository.SanPhamRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import java.time.LocalDateTime;
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
        
        model.addAttribute("sanPham", sanPham);
        model.addAttribute("pageData", pageData);
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
                                @RequestParam Integer trangThai,
                                @RequestParam(value = "imageBase64", required = false) String imageBase64,
                                @org.springframework.web.bind.annotation.RequestHeader(value = "Referer", required = false) String referer,
                                RedirectAttributes redirectAttributes) {
        
        if (giaNhap != null && giaBan != null && giaNhap.compareTo(giaBan) >= 0) {
            redirectAttributes.addFlashAttribute("errorMessage", "Lỗi: Giá nhập phải nhỏ hơn giá bán!");
            if (referer != null && !referer.isEmpty()) {
                return "redirect:" + referer;
            }
            return "redirect:/san-pham";
        }

        com.example.be.entity.SanPhamChiTiet variant = sanPhamChiTietRepository.findById(id).orElse(null);
        if (variant != null) {
            variant.setGiaBan(giaBan);
            if (giaNhap != null) {
                variant.setGiaNhap(giaNhap);
            }
            variant.setSoLuongTon(soLuongTon);
            variant.setTrangThai(trangThai);
            
            if (imageBase64 != null && !imageBase64.trim().isEmpty()) {
                try {
                    java.util.List<String> base64List = new java.util.ArrayList<>();
                    if (imageBase64.startsWith("[")) {
                        String content = imageBase64.substring(1, imageBase64.length() - 1);
                        String[] parts = content.split("\",\"");
                        for (String part : parts) {
                            String clean = part.replaceAll("^\"|\"$", "");
                            if (!clean.isEmpty()) {
                                base64List.add(clean);
                            }
                        }
                    } else {
                        base64List.add(imageBase64);
                    }
                    
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
                                @RequestParam(defaultValue = "0") int page,
                                @RequestParam(defaultValue = "5") int size) {
        Pageable pageable = PageRequest.of(page, size, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "id"));
        Page<com.example.be.entity.SanPhamChiTiet> pageData = sanPhamChiTietRepository.findAll(pageable);
        
        model.addAttribute("pageData", pageData);
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
                                    @RequestParam Integer trangThai,
                                    @RequestParam(value = "imageBase64", required = false) String imageBase64,
                                    @org.springframework.web.bind.annotation.RequestHeader(value = "Referer", required = false) String referer,
                                    RedirectAttributes redirectAttributes) {

        if (giaNhap != null && giaBan != null && giaNhap.compareTo(giaBan) >= 0) {
            redirectAttributes.addFlashAttribute("errorMessage", "Lỗi: Giá nhập phải nhỏ hơn giá bán!");
            if (referer != null && !referer.isEmpty()) {
                return "redirect:" + referer;
            }
            return "redirect:/san-pham";
        }

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
            variant.setTrangThai(trangThai);

            // Handle Image Upload
            if (imageBase64 != null && !imageBase64.trim().isEmpty()) {
                try {
                    java.util.List<String> base64List = new java.util.ArrayList<>();
                    if (imageBase64.startsWith("[")) {
                        String content = imageBase64.substring(1, imageBase64.length() - 1);
                        String[] parts = content.split("\",\"");
                        for (String part : parts) {
                            String clean = part.replaceAll("^\"|\"$", "");
                            if (!clean.isEmpty()) {
                                base64List.add(clean);
                            }
                        }
                    } else {
                        base64List.add(imageBase64);
                    }
                    
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
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "5") int size) {
        // Thêm Sort.by("id").descending() để sản phẩm mới nhất luôn hiển thị trên cùng
        Pageable pageable = PageRequest.of(page, size, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "id"));
        Page<SanPham> pageData = sanPhamService.search(keyword, trangThai, soLuongTon, idThuongHieu, idLoaiGiay, pageable);
        model.addAttribute("pageData", pageData);
        model.addAttribute("keyword", keyword);
        model.addAttribute("trangThai", trangThai);
        model.addAttribute("soLuongTon", soLuongTon);
        model.addAttribute("idThuongHieu", idThuongHieu);
        model.addAttribute("idLoaiGiay", idLoaiGiay);
        
        // Thêm các danh sách thuộc tính để hiển thị trên Dropdown của Modal Tạo Sản Phẩm
        model.addAttribute("listThuongHieu", thuongHieuRepository.findAll());
        model.addAttribute("listChatLieu", chatLieuRepository.findAll());
        model.addAttribute("listLoaiGiay", loaiGiayRepository.findAll());
        model.addAttribute("listDanhMuc", danhMucRepository.findAll());
        model.addAttribute("listMauSac", mauSacRepository.findAll());
        model.addAttribute("listCoGiay", coGiayRepository.findAll());
        
        return "san-pham";
    }

    @GetMapping("/create")
    public String createPage(Model model) {
        model.addAttribute("listThuongHieu", thuongHieuRepository.findAll());
        model.addAttribute("listChatLieu", chatLieuRepository.findAll());
        model.addAttribute("listLoaiGiay", loaiGiayRepository.findAll());
        model.addAttribute("listDanhMuc", danhMucRepository.findAll());
        model.addAttribute("listMauSac", mauSacRepository.findAll());
        model.addAttribute("listCoGiay", coGiayRepository.findAll());
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

        if (sanPhamService.existsByTenSanPham(sanPham.getTenSanPham())) {
            redirectAttributes.addFlashAttribute("errorMessage", "Tên sản phẩm đã tồn tại trong hệ thống. Vui lòng chọn tên khác!");
            return "redirect:/san-pham/create";
        }

        if (sanPham.getMaSanPham() != null && !sanPham.getMaSanPham().trim().isEmpty()) {
            if (sanPhamService.existsByMaSanPham(sanPham.getMaSanPham().trim())) {
                redirectAttributes.addFlashAttribute("errorMessage", "Mã sản phẩm đã tồn tại trong hệ thống. Vui lòng nhập mã khác hoặc để trống để tự động tạo!");
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

        if (variantPrices != null && variantImportPrices != null) {
            for (int i = 0; i < variantPrices.size(); i++) {
                java.math.BigDecimal gb = variantPrices.get(i);
                java.math.BigDecimal gn = variantImportPrices.size() > i ? variantImportPrices.get(i) : java.math.BigDecimal.ZERO;
                if (gn != null && gb != null && gn.compareTo(gb) >= 0) {
                    redirectAttributes.addFlashAttribute("errorMessage", "Lỗi: Giá nhập phải nhỏ hơn giá bán ở một số biến thể!");
                    return "redirect:/san-pham/create";
                }
            }
        }

        try {
            if (sanPham.getMaSanPham() == null || sanPham.getMaSanPham().trim().isEmpty()) {
                sanPham.setMaSanPham("SP" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            }
            sanPham.setNgayTao(java.time.LocalDateTime.now());
            if (sanPham.getSoLuong() == null) sanPham.setSoLuong(0);
            if (sanPham.getGiaBan() == null) sanPham.setGiaBan(java.math.BigDecimal.ZERO);
            if (sanPham.getGiaNhap() == null) sanPham.setGiaNhap(java.math.BigDecimal.ZERO);
            SanPham savedSp = sanPhamService.save(sanPham);

            if (variantSizes != null && variantColors != null) {
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
                                java.util.List<String> base64List = new java.util.ArrayList<>();
                                if (imgData.startsWith("[")) {
                                    String content = imgData.substring(1, imgData.length() - 1);
                                    String[] parts = content.split("\",\"");
                                    for (String part : parts) {
                                        String clean = part.replaceAll("^\"|\"$", "");
                                        if (!clean.isEmpty()) {
                                            base64List.add(clean);
                                        }
                                    }
                                } else {
                                    base64List.add(imgData);
                                }
                                
                                java.util.List<String> savedUrls = new java.util.ArrayList<>();
                                String uploadDir = "src/main/resources/static/upload/";
                                
                                for (int j = 0; j < base64List.size(); j++) {
                                    String b64 = base64List.get(j);
                                    String fileName = "variant_" + savedSp.getId() + "_" + i + "_" + System.currentTimeMillis() + "_" + j + ".png";
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
                    }

                    sanPhamChiTietRepository.save(variant);
                }
                syncTotalQuantity(savedSp.getId());
            }
            redirectAttributes.addFlashAttribute("successMessage", "Thêm sản phẩm thành công!");
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
            if (!sanPham.getTenSanPham().trim().equalsIgnoreCase(existing.getTenSanPham().trim()) && sanPhamService.existsByTenSanPham(sanPham.getTenSanPham())) {
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
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
        }
        return "redirect:/san-pham";
    }

    private String saveBase64File(String uploadDir, String fileName, String base64String) throws java.io.IOException {
        java.nio.file.Path uploadPath = java.nio.file.Paths.get(uploadDir);
        if (!java.nio.file.Files.exists(uploadPath)) {
            java.nio.file.Files.createDirectories(uploadPath);
        }
        String base64Image = base64String;
        if (base64String.contains(",")) {
            base64Image = base64String.split(",")[1];
        }
        byte[] decodedBytes = java.util.Base64.getDecoder().decode(base64Image);
        java.nio.file.Path filePath = uploadPath.resolve(fileName);
        try (java.io.FileOutputStream fos = new java.io.FileOutputStream(filePath.toFile())) {
            fos.write(decodedBytes);
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
            sanPhamService.save(sanPham);
        }
    }
}
