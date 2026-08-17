package com.example.be.controller;

import com.example.be.entity.DotGiamGia;
import com.example.be.entity.SanPham;
import com.example.be.entity.SanPhamChiTiet;
import com.example.be.repository.ChiTietDotGiamGiaRepository;
import com.example.be.repository.DotGiamGiaRepository;
import com.example.be.repository.SanPhamChiTietRepository;
import com.example.be.service.SanPhamService;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@RestController
@RequestMapping("/api/san-pham")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE})
public class SanPhamRestController {

    private final SanPhamChiTietRepository sanPhamChiTietRepository;
    private final SanPhamService sanPhamService;
    private final ChiTietDotGiamGiaRepository chiTietDotGiamGiaRepository;
    private final DotGiamGiaRepository dotGiamGiaRepository;

    public SanPhamRestController(SanPhamChiTietRepository sanPhamChiTietRepository,
                                  SanPhamService sanPhamService,
                                  ChiTietDotGiamGiaRepository chiTietDotGiamGiaRepository,
                                  DotGiamGiaRepository dotGiamGiaRepository) {
        this.sanPhamChiTietRepository = sanPhamChiTietRepository;
        this.sanPhamService = sanPhamService;
        this.chiTietDotGiamGiaRepository = chiTietDotGiamGiaRepository;
        this.dotGiamGiaRepository = dotGiamGiaRepository;
    }

    @GetMapping("/flash-sale")
    public ResponseEntity<Map<String, Object>> getFlashSaleData() {
        List<DotGiamGia> activeCampaigns = dotGiamGiaRepository.findActiveCampaigns();

        List<SanPhamChiTiet> list = sanPhamChiTietRepository.searchForSale(null);
        List<Map<String, Object>> saleProducts = new ArrayList<>();

        for (SanPhamChiTiet s : list) {
            Integer phanTramGiam = chiTietDotGiamGiaRepository.findMaxActiveDiscountBySanPhamChiTietId(s.getId(), java.time.LocalDateTime.now());

            // CHỈ LẤY CÁC SẢN PHẨM THỰC SỰ ĐANG TRONG ĐỢT GIẢM GIÁ (phanTramGiam != null && phanTramGiam > 0)
            if (phanTramGiam != null && phanTramGiam > 0) {
                BigDecimal giaBanGoc = s.getGiaBan();
                BigDecimal multiplier = BigDecimal.valueOf(100 - phanTramGiam)
                        .divide(BigDecimal.valueOf(100), 10, RoundingMode.HALF_UP);
                BigDecimal giaSauGiam = giaBanGoc != null
                        ? giaBanGoc.multiply(multiplier).setScale(0, RoundingMode.HALF_UP)
                        : BigDecimal.ZERO;

                Map<String, Object> item = new LinkedHashMap<>();
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

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("campaigns", activeCampaigns);
        response.put("products", saleProducts);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/check-cart-status")
    public ResponseEntity<List<Map<String, Object>>> checkCartStatus(@RequestBody List<Long> spctIds) {
        List<Map<String, Object>> result = new ArrayList<>();
        if (spctIds == null || spctIds.isEmpty()) {
            return ResponseEntity.ok(result);
        }

        for (Long id : spctIds) {
            Optional<SanPhamChiTiet> opt = sanPhamChiTietRepository.findById(id);
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", id);

            if (opt.isEmpty()) {
                item.put("isStopped", true);
                item.put("trangThai", 0);
                item.put("soLuongTon", 0);
                item.put("message", "Sản phẩm không còn tồn tại");
            } else {
                SanPhamChiTiet s = opt.get();
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

                // Lấy giá và giảm giá mới nhất
                Integer phanTramGiam = chiTietDotGiamGiaRepository.findMaxActiveDiscountBySanPhamChiTietId(s.getId(), java.time.LocalDateTime.now());
                BigDecimal giaBanGoc = s.getGiaBan();

                if (phanTramGiam != null && phanTramGiam > 0 && giaBanGoc != null) {
                    BigDecimal multiplier = BigDecimal.valueOf(100 - phanTramGiam)
                            .divide(BigDecimal.valueOf(100), 10, RoundingMode.HALF_UP);
                    BigDecimal giaSauGiam = giaBanGoc.multiply(multiplier).setScale(0, RoundingMode.HALF_UP);
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
        return ResponseEntity.ok(result);
    }

    @GetMapping("/search-sale")
    public ResponseEntity<List<Map<String, Object>>> searchForSale(
            @RequestParam(required = false, defaultValue = "") String keyword) {

        List<SanPhamChiTiet> list = sanPhamChiTietRepository.searchForSale(
                keyword == null || keyword.isBlank() ? null : keyword.trim()
        );

        List<Map<String, Object>> result = new ArrayList<>();
        for (SanPhamChiTiet s : list) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", s.getId());
            item.put("sanPhamId", (s.getSanPham() != null) ? s.getSanPham().getId() : null);
            item.put("ma", s.getMa());
            item.put("tenSanPham", (s.getSanPham() != null) ? s.getSanPham().getTenSanPham() : "Sản phẩm");
            item.put("mauSac", (s.getMauSac() != null) ? s.getMauSac().getTenMauSac() : "");
            item.put("sizeGiay", (s.getCoGiay() != null) ? s.getCoGiay().getSizeGiay() : null);
            item.put("soLuongTon", s.getSoLuongTon() != null ? s.getSoLuongTon() : 0);
            item.put("hinhAnh", resolveImageUrl(s));

            // Lấy % giảm giá thực tế từ đợt giảm giá đang kích hoạt
            Integer phanTramGiam = chiTietDotGiamGiaRepository.findMaxActiveDiscountBySanPhamChiTietId(s.getId(), java.time.LocalDateTime.now());
            BigDecimal giaBanGoc = s.getGiaBan();

            if (phanTramGiam != null && phanTramGiam > 0 && giaBanGoc != null) {
                BigDecimal multiplier = BigDecimal.valueOf(100 - phanTramGiam)
                        .divide(BigDecimal.valueOf(100), 10, RoundingMode.HALF_UP);
                BigDecimal giaSauGiam = giaBanGoc.multiply(multiplier).setScale(0, RoundingMode.HALF_UP);
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
        return ResponseEntity.ok(result);
    }

    @GetMapping("/detail-by-spct/{spctId}")
    public ResponseEntity<?> getDetailBySpctId(@PathVariable Long spctId) {
        Optional<SanPhamChiTiet> opt = sanPhamChiTietRepository.findById(spctId);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        SanPhamChiTiet target = opt.get();
        if (target.getSanPham() == null) {
            return ResponseEntity.badRequest().body("Sản phẩm không có thông tin gốc!");
        }
        Long sanPhamId = target.getSanPham().getId();
        // Chỉ lấy các biến thể đang kinh doanh (trangThai = 1)
        List<SanPhamChiTiet> variants = sanPhamChiTietRepository.findBySanPhamIdActiveOnly(sanPhamId);

        // Nếu biến thể hiện tại đã ngừng kinh doanh, tự động chuyển sang biến thể còn đang kinh doanh
        if ((target.getTrangThai() != null && target.getTrangThai() != 1) && !variants.isEmpty()) {
            target = variants.get(0);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("target", mapToMap(target));

        List<Map<String, Object>> variantList = new ArrayList<>();
        for (SanPhamChiTiet v : variants) {
            variantList.add(mapToMap(v));
        }
        response.put("variants", variantList);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/reduce-stock/{id}")
    @Transactional
    public ResponseEntity<?> reduceStock(@PathVariable Long id, @RequestParam Integer quantity) {
        Optional<SanPhamChiTiet> opt = sanPhamChiTietRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        SanPhamChiTiet spct = opt.get();
        if (spct.getTrangThai() != null && spct.getTrangThai() != 1) {
            return ResponseEntity.badRequest().body("Sản phẩm này đã ngừng kinh doanh!");
        }
        int stock = spct.getSoLuongTon() != null ? spct.getSoLuongTon() : 0;
        if (stock < quantity) {
            return ResponseEntity.badRequest().body("Số lượng trong kho không đủ để bán!");
        }
        
        return ResponseEntity.ok(Map.of("success", true, "newStock", spct.getSoLuongTon()));
    }

    @PostMapping("/increase-stock/{id}")
    @Transactional
    public ResponseEntity<?> increaseStock(@PathVariable Long id, @RequestParam Integer quantity) {
        Optional<SanPhamChiTiet> opt = sanPhamChiTietRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        SanPhamChiTiet spct = opt.get();
        int stock = spct.getSoLuongTon() != null ? spct.getSoLuongTon() : 0;
        spct.setSoLuongTon(stock + quantity);
        sanPhamChiTietRepository.save(spct);
        
        if (spct.getSanPham() != null) {
            syncTotalQuantity(spct.getSanPham().getId());
        }
        
        return ResponseEntity.ok(Map.of("success", true, "newStock", spct.getSoLuongTon()));
    }

    private void syncTotalQuantity(Long sanPhamId) {
        SanPham sanPham = sanPhamService.findById(sanPhamId);
        if (sanPham != null) {
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
            sanPhamService.save(sanPham);
        }
    }

    private Map<String, Object> mapToMap(SanPhamChiTiet s) {
        Map<String, Object> item = new LinkedHashMap<>();
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

        // Lấy % giảm giá thực tế từ đợt giảm giá đang kích hoạt trong DB
        Integer phanTramGiam = chiTietDotGiamGiaRepository.findMaxActiveDiscountBySanPhamChiTietId(s.getId(), java.time.LocalDateTime.now());
        BigDecimal giaBanGoc = s.getGiaBan();

        if (phanTramGiam != null && phanTramGiam > 0 && giaBanGoc != null) {
            // giá hiện tại trong DB là giá gốc, tính giá sau giảm
            BigDecimal multiplier = BigDecimal.valueOf(100 - phanTramGiam)
                    .divide(BigDecimal.valueOf(100), 10, RoundingMode.HALF_UP);
            BigDecimal giaSauGiam = giaBanGoc.multiply(multiplier)
                    .setScale(0, RoundingMode.HALF_UP);
            item.put("giaBan", giaSauGiam);       // giá sau giảm (hiển thị chính)
            item.put("giaGoc", giaBanGoc);         // giá gốc (gạch ngang)
            item.put("phanTramGiam", phanTramGiam); // % hiển thị badge
        } else {
            item.put("giaBan", giaBanGoc);
            item.put("giaGoc", null);              // không có giảm giá
            item.put("phanTramGiam", null);
        }

        return item;
    }

    private String resolveImageUrl(SanPhamChiTiet s) {
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
        // Fallback sang các biến thể cùng sản phẩm
        if (s.getSanPham() != null && s.getSanPham().getId() != null) {
            List<SanPhamChiTiet> siblings = sanPhamChiTietRepository.findBySanPhamId(s.getSanPham().getId());
            for (SanPhamChiTiet sib : siblings) {
                if (sib.getDanhSachHinhAnh() != null && !sib.getDanhSachHinhAnh().isEmpty()) {
                    String first = sib.getDanhSachHinhAnh().get(0);
                    if (first != null && !first.isBlank()) {
                        return first.trim();
                    }
                }
                if (sib.getHinhAnh() != null && !sib.getHinhAnh().isBlank() && !sib.getHinhAnh().equals("[]") && !sib.getHinhAnh().equals("[\"\"]")) {
                    String clean = sib.getHinhAnh().replaceAll("[\\[\\]\"]", "").trim();
                    if (!clean.isEmpty()) {
                        return clean.split("\\s*,\\s*")[0].trim();
                    }
                }
            }
        }
        return null;
    }
}
