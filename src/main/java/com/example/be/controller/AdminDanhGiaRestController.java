package com.example.be.controller;

import com.example.be.entity.*;
import com.example.be.repository.ChiTietHoaDonRepository;
import com.example.be.repository.DanhGiaRepository;
import com.example.be.repository.SanPhamChiTietRepository;
import com.example.be.repository.SanPhamRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/admin/danh-gia")
public class AdminDanhGiaRestController {

    @Autowired private DanhGiaRepository danhGiaRepository;
    @Autowired private SanPhamRepository sanPhamRepository;
    @Autowired private SanPhamChiTietRepository sanPhamChiTietRepository;
    @Autowired private ChiTietHoaDonRepository chiTietHoaDonRepository;

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy");

    @GetMapping
    public ResponseEntity<?> getAllReviews() {
        List<DanhGia> all = danhGiaRepository.findAll();
        all.sort((a, b) -> {
            if (a.getNgayTao() == null && b.getNgayTao() == null) return 0;
            if (a.getNgayTao() == null) return 1;
            if (b.getNgayTao() == null) return -1;
            return b.getNgayTao().compareTo(a.getNgayTao());
        });

        List<Map<String, Object>> result = new ArrayList<>();
        for (DanhGia d : all) {
            result.add(convertToMap(d));
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/by-product")
    public ResponseEntity<?> getReviewsByProduct() {
        List<SanPham> allProducts = sanPhamRepository.findAll();
        List<DanhGia> allReviews = danhGiaRepository.findAll();

        Map<Long, List<DanhGia>> reviewsByProdId = new HashMap<>();
        for (DanhGia d : allReviews) {
            Long prodId = null;
            if (d.getSanPham() != null) {
                prodId = d.getSanPham().getId();
            } else if (d.getHoaDon() != null) {
                List<ChiTietHoaDon> cthds = chiTietHoaDonRepository.findByHoaDonId(d.getHoaDon().getId());
                if (cthds != null && !cthds.isEmpty() && cthds.get(0).getSanPhamChiTiet() != null && cthds.get(0).getSanPhamChiTiet().getSanPham() != null) {
                    prodId = cthds.get(0).getSanPhamChiTiet().getSanPham().getId();
                }
            }
            if (prodId != null) {
                reviewsByProdId.computeIfAbsent(prodId, k -> new ArrayList<>()).add(d);
            }
        }

        List<Map<String, Object>> result = new ArrayList<>();
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");

        for (SanPham sp : allProducts) {
            List<DanhGia> prodReviews = reviewsByProdId.getOrDefault(sp.getId(), Collections.emptyList());
            int count = prodReviews.size();
            double avgRating = 5.0;
            String latestTime = "-";
            java.time.LocalDateTime latestDate = null;

            if (count > 0) {
                double sum = 0;
                for (DanhGia dg : prodReviews) {
                    sum += (dg.getSoSao() != null ? dg.getSoSao() : 5);
                    if (dg.getNgayTao() != null) {
                        if (latestDate == null || dg.getNgayTao().isAfter(latestDate)) {
                            latestDate = dg.getNgayTao();
                        }
                    }
                }
                avgRating = Math.round((sum / count) * 10.0) / 10.0;
                if (latestDate != null) {
                    latestTime = latestDate.format(dtf);
                }
            }

            String spHinhAnh = null;
            List<SanPhamChiTiet> spcts = sanPhamChiTietRepository.findBySanPhamId(sp.getId());
            if (spcts != null && !spcts.isEmpty()) {
                for (SanPhamChiTiet ct : spcts) {
                    if (ct.getDanhSachHinhAnh() != null && !ct.getDanhSachHinhAnh().isEmpty()) {
                        spHinhAnh = ct.getDanhSachHinhAnh().get(0);
                        break;
                    }
                    if (ct.getHinhAnh() != null && !ct.getHinhAnh().isBlank() && !ct.getHinhAnh().equals("[]") && !ct.getHinhAnh().equals("[\"\"]")) {
                        spHinhAnh = ct.getHinhAnh();
                        break;
                    }
                }
            }

            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", sp.getId());
            map.put("tenSanPham", sp.getTenSanPham());
            map.put("ma", sp.getMaSanPham() != null ? sp.getMaSanPham() : ("SP" + sp.getId()));
            map.put("hinhAnh", spHinhAnh);
            map.put("soDanhGia", count);
            map.put("diemTB", (avgRating == (long) avgRating) ? String.format("%d", (long) avgRating) : String.format("%.1f", avgRating));
            map.put("diemTBNumeric", avgRating);
            map.put("moiNhat", latestTime);
            map.put("latestDateIso", latestDate != null ? latestDate.toString() : "");

            List<Map<String, Object>> reviewsList = new ArrayList<>();
            for (DanhGia dg : prodReviews) {
                reviewsList.add(convertToMap(dg));
            }
            reviewsList.sort((a, b) -> {
                String da = (String) a.get("ngayTaoIso");
                String db = (String) b.get("ngayTaoIso");
                if (da == null && db == null) return 0;
                if (da == null) return 1;
                if (db == null) return -1;
                return db.compareTo(da);
            });
            map.put("reviews", reviewsList);

            result.add(map);
        }

        result.sort((a, b) -> {
            int countA = (int) a.get("soDanhGia");
            int countB = (int) b.get("soDanhGia");
            if (countA > 0 && countB == 0) return -1;
            if (countA == 0 && countB > 0) return 1;
            String dateA = (String) a.get("latestDateIso");
            String dateB = (String) b.get("latestDateIso");
            return dateB.compareTo(dateA);
        });

        return ResponseEntity.ok(result);
    }

    @GetMapping("/analyze/{productId}")
    public ResponseEntity<?> analyzeProductReviews(@PathVariable Long productId) {
        SanPham sp = sanPhamRepository.findById(productId).orElse(null);
        if (sp == null) return ResponseEntity.notFound().build();

        List<DanhGia> allReviews = danhGiaRepository.findAll();
        List<DanhGia> prodReviews = new ArrayList<>();
        for (DanhGia d : allReviews) {
            Long pId = null;
            if (d.getSanPham() != null) pId = d.getSanPham().getId();
            else if (d.getHoaDon() != null) {
                List<ChiTietHoaDon> cthds = chiTietHoaDonRepository.findByHoaDonId(d.getHoaDon().getId());
                if (cthds != null && !cthds.isEmpty() && cthds.get(0).getSanPhamChiTiet() != null && cthds.get(0).getSanPhamChiTiet().getSanPham() != null) {
                    pId = cthds.get(0).getSanPhamChiTiet().getSanPham().getId();
                }
            }
            if (productId.equals(pId)) {
                prodReviews.add(d);
            }
        }

        int total = prodReviews.size();
        int pos = 0, neu = 0, neg = 0;
        double sumStars = 0;
        int withImg = 0;
        for (DanhGia d : prodReviews) {
            int s = d.getSoSao() != null ? d.getSoSao() : 5;
            sumStars += s;
            if (s >= 4) pos++;
            else if (s == 3) neu++;
            else neg++;
            if (d.getAnhDanhGia() != null && !d.getAnhDanhGia().trim().isEmpty() && !d.getAnhDanhGia().trim().equals("[]")) withImg++;
        }
        double avg = total > 0 ? Math.round((sumStars / total) * 10.0) / 10.0 : 5.0;

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("productId", productId);
        resp.put("productName", sp.getTenSanPham());
        resp.put("totalReviews", total);
        resp.put("avgRating", avg);
        resp.put("positiveCount", pos);
        resp.put("neutralCount", neu);
        resp.put("negativeCount", neg);
        resp.put("withImagesCount", withImg);
        resp.put("positivePercent", total > 0 ? Math.round((pos * 100.0) / total) : 0);
        resp.put("negativePercent", total > 0 ? Math.round((neg * 100.0) / total) : 0);

        return ResponseEntity.ok(resp);
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getStats() {
        List<DanhGia> all = danhGiaRepository.findAll();
        int total = all.size();
        double sumStars = 0;
        int count5 = 0, count4 = 0, count3 = 0, count2 = 0, count1 = 0;
        int withImages = 0;
        int visible = 0;
        int hidden = 0;

        for (DanhGia d : all) {
            int stars = d.getSoSao() != null ? d.getSoSao() : 5;
            sumStars += stars;
            if (stars == 5) count5++;
            else if (stars == 4) count4++;
            else if (stars == 3) count3++;
            else if (stars == 2) count2++;
            else if (stars == 1) count1++;

            if (d.getAnhDanhGia() != null && !d.getAnhDanhGia().trim().isEmpty() && !d.getAnhDanhGia().trim().equals("[]")) {
                withImages++;
            }

            if (d.getTrangThai() != null && d.getTrangThai() == 1) {
                visible++;
            } else {
                hidden++;
            }
        }

        double avg = total > 0 ? Math.round((sumStars / total) * 10.0) / 10.0 : 5.0;

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalReviews", total);
        stats.put("avgRating", avg);
        stats.put("count5Star", count5);
        stats.put("count4Star", count4);
        stats.put("count3Star", count3);
        stats.put("count2Star", count2);
        stats.put("count1Star", count1);
        stats.put("countWithImages", withImages);
        stats.put("countVisible", visible);
        stats.put("countHidden", hidden);

        return ResponseEntity.ok(stats);
    }

    @PutMapping("/{id}/reply")
    public ResponseEntity<?> replyReview(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        return danhGiaRepository.findById(id).map(dg -> {
            String phanHoi = payload.get("phanHoi");
            String nguoiPhanHoi = payload.getOrDefault("nguoiPhanHoi", "Shop VShoes");

            if (phanHoi == null || phanHoi.trim().isEmpty()) {
                // Xoá phản hồi
                dg.setPhanHoi(null);
                dg.setNgayPhanHoi(null);
                dg.setNguoiPhanHoi(null);
            } else {
                dg.setPhanHoi(phanHoi.trim());
                dg.setNgayPhanHoi(java.time.LocalDateTime.now());
                dg.setNguoiPhanHoi(nguoiPhanHoi != null && !nguoiPhanHoi.trim().isEmpty() ? nguoiPhanHoi.trim() : "Shop VShoes");
            }
            danhGiaRepository.save(dg);
            return ResponseEntity.ok(convertToMap(dg));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/toggle-status")
    public ResponseEntity<?> toggleStatus(@PathVariable Long id) {
        return danhGiaRepository.findById(id).map(dg -> {
            int current = dg.getTrangThai() != null ? dg.getTrangThai() : 1;
            dg.setTrangThai(current == 1 ? 0 : 1);
            danhGiaRepository.save(dg);
            return ResponseEntity.ok(convertToMap(dg));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteReview(@PathVariable Long id) {
        return danhGiaRepository.findById(id).map(dg -> {
            danhGiaRepository.delete(dg);
            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("success", true);
            resp.put("message", "Đã xoá đánh giá thành công!");
            return ResponseEntity.ok(resp);
        }).orElse(ResponseEntity.notFound().build());
    }

    private Map<String, Object> convertToMap(DanhGia d) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", d.getId());
        m.put("soSao", d.getSoSao() != null ? d.getSoSao() : 5);
        m.put("noiDung", d.getNoiDung() != null ? d.getNoiDung() : "");
        m.put("trangThai", d.getTrangThai() != null ? d.getTrangThai() : 1);
        m.put("ngayTao", d.getNgayTao() != null ? d.getNgayTao().format(FMT) : "");
        m.put("ngayTaoIso", d.getNgayTao() != null ? d.getNgayTao().toString() : "");
        m.put("tenHienThi", d.getTenHienThi());

        // Phản hồi từ shop
        m.put("phanHoi", d.getPhanHoi());
        m.put("ngayPhanHoi", d.getNgayPhanHoi() != null ? d.getNgayPhanHoi().format(FMT) : "");
        m.put("nguoiPhanHoi", d.getNguoiPhanHoi() != null ? d.getNguoiPhanHoi() : "Shop VShoes");

        // Parse images
        List<String> images = new ArrayList<>();
        if (d.getAnhDanhGia() != null && !d.getAnhDanhGia().isBlank()) {
            String raw = d.getAnhDanhGia().trim();
            if (raw.startsWith("[") && raw.endsWith("]")) {
                String inner = raw.substring(1, raw.length() - 1).trim();
                if (!inner.isEmpty()) {
                    for (String part : inner.split(",")) {
                        String clean = part.trim().replace("\"", "").replace("'", "").replace("\\", "");
                        if (!clean.isEmpty()) images.add(clean);
                    }
                }
            } else {
                images.add(raw);
            }
        }
        m.put("anhDanhGia", images);

        // SanPham info
        SanPham sp = d.getSanPham();
        if (sp == null && d.getHoaDon() != null) {
            List<ChiTietHoaDon> cthds = chiTietHoaDonRepository.findByHoaDonId(d.getHoaDon().getId());
            if (cthds != null && !cthds.isEmpty() && cthds.get(0).getSanPhamChiTiet() != null) {
                sp = cthds.get(0).getSanPhamChiTiet().getSanPham();
            }
        }

        String spHinhAnh = null;
        if (sp != null) {
            List<SanPhamChiTiet> spcts = sanPhamChiTietRepository.findBySanPhamId(sp.getId());
            if (spcts != null && !spcts.isEmpty()) {
                spHinhAnh = spcts.get(0).getHinhAnh();
            }
        }

        Map<String, Object> spMap = new LinkedHashMap<>();
        if (sp != null) {
            spMap.put("id", sp.getId());
            spMap.put("tenSanPham", sp.getTenSanPham());
            spMap.put("ma", sp.getMaSanPham() != null ? sp.getMaSanPham() : ("SP" + sp.getId()));
            spMap.put("hinhAnh", spHinhAnh);
        } else {
            spMap.put("id", null);
            spMap.put("tenSanPham", "Giày Thể Thao VShoes");
            spMap.put("ma", "SP-N/A");
            spMap.put("hinhAnh", "/images/white.png");
        }
        m.put("sanPham", spMap);

        // KhachHang info
        KhachHang kh = d.getKhachHang();
        Map<String, Object> khMap = new LinkedHashMap<>();
        if (kh != null) {
            khMap.put("id", kh.getId());
            khMap.put("hoTen", kh.getHoTen());
            khMap.put("soDienThoai", kh.getSoDienThoai());
            khMap.put("email", kh.getEmail());
        } else if (d.getHoaDon() != null) {
            HoaDon hd = d.getHoaDon();
            KhachHang hdKh = hd.getKhachHang();
            String tenKh = (hdKh != null && hdKh.getHoTen() != null) ? hdKh.getHoTen() : (hd.getTenNguoiNhan() != null ? hd.getTenNguoiNhan() : d.getTenHienThi());
            String sdtKh = (hdKh != null && hdKh.getSoDienThoai() != null) ? hdKh.getSoDienThoai() : hd.getSdtNguoiNhan();
            String emailKh = (hdKh != null) ? hdKh.getEmail() : "";
            khMap.put("id", hdKh != null ? hdKh.getId() : null);
            khMap.put("hoTen", tenKh != null ? tenKh : "Khách hàng");
            khMap.put("soDienThoai", sdtKh != null ? sdtKh : "");
            khMap.put("email", emailKh != null ? emailKh : "");
        } else {
            khMap.put("id", null);
            khMap.put("hoTen", d.getTenHienThi() != null ? d.getTenHienThi() : "Khách hàng");
            khMap.put("soDienThoai", "");
            khMap.put("email", "");
        }
        m.put("khachHang", khMap);

        // HoaDon info
        HoaDon hd = d.getHoaDon();
        Map<String, Object> hdMap = new LinkedHashMap<>();
        if (hd != null) {
            hdMap.put("id", hd.getId());
            hdMap.put("maHoaDon", hd.getMaHoaDon());
            hdMap.put("tongTien", hd.getTongTien());
            hdMap.put("ngayTao", hd.getNgayTao() != null ? hd.getNgayTao().format(FMT) : "");
        }
        m.put("hoaDon", hdMap.isEmpty() ? null : hdMap);

        return m;
    }
}
