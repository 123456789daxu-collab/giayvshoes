package com.example.be.controller;

import com.example.be.entity.SanPham;
import com.example.be.entity.SanPhamChiTiet;
import com.example.be.service.SanPhamService;
import com.example.be.service.ThuocTinhService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/san-pham")
public class SanPhamController {

    @Autowired
    private SanPhamService sanPhamService;

    @Autowired
    private ThuocTinhService thuocTinhService;

    private void addAttributeLists(Model model) {
        model.addAttribute("listThuongHieu", thuocTinhService.getAllThuongHieu());
        model.addAttribute("listChatLieu", thuocTinhService.getAllChatLieu());
        model.addAttribute("listLoaiGiay", thuocTinhService.getAllLoaiGiay());
        model.addAttribute("listDanhMuc", thuocTinhService.getAllDanhMuc());
        model.addAttribute("listMauSac", thuocTinhService.getAllMauSac());
        model.addAttribute("listCoGiay", thuocTinhService.getAllCoGiay());
    }

    @GetMapping("/edit/{id}")
    public String edit(@PathVariable Long id, 
                       @RequestParam(defaultValue = "0") int page,
                       @RequestParam(defaultValue = "5") int size,
                       Model model) {
        SanPham sanPham = sanPhamService.findById(id);
        if (sanPham == null) {
            return "redirect:/san-pham";
        }
        Page<SanPhamChiTiet> pageData = sanPhamService.getVariantsBySanPhamId(id, PageRequest.of(page, size));
        Map<String, Object> discountData = sanPhamService.calculateDiscounts(pageData.getContent());
        
        model.addAttribute("sanPham", sanPham);
        model.addAttribute("pageData", pageData);
        model.addAttribute("phanTramGiamMap", discountData.get("phanTramGiamMap"));
        model.addAttribute("giaSauGiamMap", discountData.get("giaSauGiamMap"));
        addAttributeLists(model);
        
        return "chi-tiet-san-pham";
    }

    @PostMapping("/update-variant/{id}")
    public String updateVariant(@PathVariable Long id, 
                                @RequestParam BigDecimal giaBan,
                                @RequestParam(required = false) BigDecimal giaNhap,
                                @RequestParam Integer soLuongTon,
                                @RequestParam(required = false) Integer trangThai,
                                @RequestParam(value = "imageBase64", required = false) String imageBase64,
                                @RequestHeader(value = "Referer", required = false) String referer,
                                RedirectAttributes redirectAttributes) {
        try {
            sanPhamService.updateVariant(id, giaBan, giaNhap, soLuongTon, trangThai, imageBase64);
            redirectAttributes.addFlashAttribute("successMessage", "Cập nhật thành công!");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Lỗi: " + e.getMessage());
        }
        if (referer != null && !referer.isEmpty()) {
            return "redirect:" + referer;
        }
        return "redirect:/san-pham";
    }

    @GetMapping("/toggle-status-variant/{id}")
    public String toggleStatusVariant(@PathVariable Long id, 
                                      @RequestHeader(value = "Referer", required = false) String referer,
                                      RedirectAttributes redirectAttributes) {
        try {
            sanPhamService.toggleStatusVariant(id);
            redirectAttributes.addFlashAttribute("successMessage", "Thay đổi trạng thái thành công!");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Lỗi: " + e.getMessage());
        }
        if (referer != null && !referer.isEmpty()) {
            return "redirect:" + referer;
        }
        return "redirect:/san-pham";
    }

    @GetMapping("/chi-tiet-global")
    public String chiTietGlobal(Model model, 
                                @RequestParam(required = false) String keyword,
                                @RequestParam(required = false) Long sanPhamId,
                                @RequestParam(defaultValue = "0") int page,
                                @RequestParam(defaultValue = "5") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        Page<SanPhamChiTiet> pageData;
        if (sanPhamId != null) {
            pageData = sanPhamService.getVariantsBySanPhamId(sanPhamId, pageable);
        } else {
            pageData = sanPhamService.searchVariantsGlobal(keyword, pageable);
        }
        
        Map<String, Object> discountData = sanPhamService.calculateDiscounts(pageData.getContent());
        
        model.addAttribute("pageData", pageData);
        model.addAttribute("phanTramGiamMap", discountData.get("phanTramGiamMap"));
        model.addAttribute("giaSauGiamMap", discountData.get("giaSauGiamMap"));
        model.addAttribute("keyword", keyword);
        model.addAttribute("sanPhamId", sanPhamId);
        addAttributeLists(model);
        
        return "san-pham-chi-tiet-global";
    }

    @GetMapping("/variant-detail/{id}")
    public String variantDetail(@PathVariable Long id, Model model) {
        SanPhamChiTiet variant = sanPhamService.getVariantById(id);
        if (variant != null) {
            model.addAttribute("ct", variant);
            addAttributeLists(model);
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
                                    @RequestParam(required = false) BigDecimal giaNhap,
                                    @RequestParam BigDecimal giaBan,
                                    @RequestParam Integer soLuongTon,
                                    @RequestParam(required = false) Integer trangThai,
                                    @RequestParam(value = "imageBase64", required = false) String imageBase64,
                                    RedirectAttributes redirectAttributes) {
        try {
            sanPhamService.updateVariantFull(id, idThuongHieu, idChatLieu, idDanhMuc, idLoaiGiay, moTaChiTiet, idMauSac, idCoGiay, trangLuong, giaNhap, giaBan, soLuongTon, trangThai, imageBase64);
            redirectAttributes.addFlashAttribute("successMessage", "Cập nhật biến thể thành công!");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Lỗi: " + e.getMessage());
        }
        SanPhamChiTiet variant = sanPhamService.getVariantById(id);
        if (variant != null && variant.getSanPham() != null) {
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
                        @RequestParam(required = false) BigDecimal minPrice,
                        @RequestParam(required = false) BigDecimal maxPrice,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "5") int size,
                        @RequestParam(required = false, defaultValue = "price_asc") String sort) {
        
        sanPhamService.syncMissingPricesAndQuantities();
        
        Sort sortObj = Sort.by(Sort.Direction.ASC, "giaBan");
        if (sort != null && !sort.isEmpty()) {
            switch (sort) {
                case "name_asc": sortObj = Sort.by(Sort.Direction.ASC, "tenSanPham"); break;
                case "name_desc": sortObj = Sort.by(Sort.Direction.DESC, "tenSanPham"); break;
                case "price_asc": sortObj = Sort.by(Sort.Direction.ASC, "giaBan"); break;
                case "price_desc": sortObj = Sort.by(Sort.Direction.DESC, "giaBan"); break;
                case "qty_asc": sortObj = Sort.by(Sort.Direction.ASC, "soLuong"); break;
                case "qty_desc": sortObj = Sort.by(Sort.Direction.DESC, "soLuong"); break;
                case "id_desc": sortObj = Sort.by(Sort.Direction.DESC, "id"); break;
            }
        }
        
        Pageable pageable = PageRequest.of(page > 0 ? page - 1 : 0, size, sortObj);
        Page<SanPham> pageData = sanPhamService.search(keyword, trangThai, soLuongTon, idThuongHieu, idLoaiGiay, minPrice, maxPrice, pageable);
        
        model.addAttribute("pageData", pageData);
        model.addAttribute("listSanPham", pageData.getContent());
        model.addAttribute("currentPage", page > 0 ? page : 1);
        model.addAttribute("totalPages", pageData.getTotalPages());
        model.addAttribute("totalItems", pageData.getTotalElements());
        
        List<SanPham> allProducts = sanPhamService.getAll();
        long totalProducts = allProducts != null ? allProducts.size() : 0;
        long activeProducts = allProducts != null ? allProducts.stream().filter(sp -> sp != null && sp.getTrangThai() != null && sp.getTrangThai() == 1).count() : 0;
        long inactiveProducts = allProducts != null ? allProducts.stream().filter(sp -> sp != null && (sp.getTrangThai() == null || sp.getTrangThai() == 0)).count() : 0;
        
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
        
        addAttributeLists(model);
        
        return "san-pham";
    }

    @GetMapping("/export/excel")
    public ResponseEntity<?> exportExcel(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer trangThai,
            @RequestParam(required = false) Integer soLuongTon,
            @RequestParam(required = false) Long idThuongHieu,
            @RequestParam(required = false) Long idLoaiGiay,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false, defaultValue = "price_asc") String sort) {
        try {
            Sort sortObj = Sort.by(Sort.Direction.ASC, "giaBan");
            if (sort != null && !sort.isEmpty()) {
                switch (sort) {
                    case "name_asc": sortObj = Sort.by(Sort.Direction.ASC, "tenSanPham"); break;
                    case "name_desc": sortObj = Sort.by(Sort.Direction.DESC, "tenSanPham"); break;
                    case "price_asc": sortObj = Sort.by(Sort.Direction.ASC, "giaBan"); break;
                    case "price_desc": sortObj = Sort.by(Sort.Direction.DESC, "giaBan"); break;
                    case "qty_asc": sortObj = Sort.by(Sort.Direction.ASC, "soLuong"); break;
                    case "qty_desc": sortObj = Sort.by(Sort.Direction.DESC, "soLuong"); break;
                    case "id_desc": sortObj = Sort.by(Sort.Direction.DESC, "id"); break;
                }
            }
            Pageable pageable = PageRequest.of(0, 10000, sortObj);
            Page<SanPham> pageData = sanPhamService.search(keyword, trangThai, soLuongTon, idThuongHieu, idLoaiGiay, minPrice, maxPrice, pageable);
            
            byte[] bytes = sanPhamService.exportExcel(pageData.getContent());

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=Danh_sach_san_pham.xlsx")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(bytes);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi xuất Excel: " + e.getMessage());
        }
    }

    @GetMapping("/api/check-name")
    @ResponseBody
    public Map<String, Boolean> checkName(@RequestParam String name) {
        boolean exists = sanPhamService.existsByTenSanPham(name.trim());
        return Map.of("exists", exists);
    }

    @GetMapping("/api/next-code")
    @ResponseBody
    public Map<String, String> getNextCode() {
        return Map.of("code", sanPhamService.generateNextMaSanPham());
    }

    @GetMapping("/create")
    public String createPage(Model model) {
        model.addAttribute("nextMaSanPham", sanPhamService.generateNextMaSanPham());
        addAttributeLists(model);
        return "add-san-pham";
    }

    @PostMapping("/save-all")
    public String saveAll(@ModelAttribute SanPham sanPham,
                          @RequestParam(value = "variantSizes", required = false) List<Long> variantSizes,
                          @RequestParam(value = "variantColors", required = false) List<Long> variantColors,
                          @RequestParam(value = "variantQuantities", required = false) List<Integer> variantQuantities,
                          @RequestParam(value = "variantPrices", required = false) List<BigDecimal> variantPrices,
                          @RequestParam(value = "variantImportPrices", required = false) List<BigDecimal> variantImportPrices,
                          @RequestParam(value = "variantImages", required = false) List<String> variantImages,
                          RedirectAttributes redirectAttributes) {
        try {
            sanPhamService.saveProductWithVariants(sanPham, variantSizes, variantColors, variantQuantities, variantPrices, variantImportPrices, variantImages);
            redirectAttributes.addFlashAttribute("successMessage", "Lưu sản phẩm thành công!");
        } catch (IllegalArgumentException | IllegalStateException ex) {
            redirectAttributes.addFlashAttribute("errorMessage", ex.getMessage());
            return "redirect:/san-pham/create";
        } catch (Exception ex) {
            redirectAttributes.addFlashAttribute("errorMessage", "Lỗi: " + ex.getMessage());
        }
        return "redirect:/san-pham";
    }

    @PostMapping("/update/{id}")
    public String update(@PathVariable Long id, @ModelAttribute SanPham sanPham, RedirectAttributes redirectAttributes) {
        try {
            sanPhamService.update(id, sanPham);
            redirectAttributes.addFlashAttribute("successMessage", "Cập nhật sản phẩm thành công");
        } catch (IllegalArgumentException | IllegalStateException ex) {
            redirectAttributes.addFlashAttribute("errorMessage", ex.getMessage());
        } catch (Exception ex) {
            redirectAttributes.addFlashAttribute("errorMessage", "Lỗi cập nhật sản phẩm: " + ex.getMessage());
        }
        return "redirect:/san-pham";
    }

    @GetMapping("/toggle-status/{id}")
    public String toggleStatus(@PathVariable Long id, 
                               @RequestHeader(value = "Referer", required = false) String referer,
                               RedirectAttributes redirectAttributes) {
        int newStatus = sanPhamService.toggleProductStatus(id);
        String statusText = (newStatus == 1) ? "Kinh doanh" : "Ngừng kinh doanh";
        redirectAttributes.addFlashAttribute("successMessage", "Đã đổi trạng thái sản phẩm sang: " + statusText);
        if (referer != null && !referer.isEmpty()) {
            return "redirect:" + referer;
        }
        return "redirect:/san-pham";
    }
}
