package com.example.be.service.impl;

import com.example.be.entity.*;
import com.example.be.repository.*;
import com.example.be.service.DanhGiaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class DanhGiaServiceImpl implements DanhGiaService {

    @Autowired private DanhGiaRepository danhGiaRepository;
    @Autowired private HoaDonRepository hoaDonRepository;
    @Autowired private SanPhamRepository sanPhamRepository;
    @Autowired private SanPhamChiTietRepository sanPhamChiTietRepository;
    @Autowired private ChiTietHoaDonRepository chiTietHoaDonRepository;

    private static final String UPLOAD_DIR = "src/main/resources/static/upload/";
    private static final String UPLOAD_DIR_TARGET = "target/classes/static/upload/";
    private static final int MAX_IMAGES = 5;
    private static final long MAX_SIZE_BYTES = 5 * 1024 * 1024;
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy");

    @Override
    public List<Map<String, Object>> getAllReviews() {
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
        return result;
    }

    @Override
    public List<Map<String, Object>> getReviewsByProduct() {
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

            double avgRating = 0.0;
            String latestTime = "-";
            LocalDateTime latestDate = null;

            if (count > 0) {
                double sum = 0.0;
                for (DanhGia dg : prodReviews) {
                    sum += (dg.getSoSao() != null ? dg.getSoSao() : 5);
                    if (dg.getNgayTao() != null && (latestDate == null || dg.getNgayTao().isAfter(latestDate))) {
                        latestDate = dg.getNgayTao();
                    }
                }
                avgRating = Math.round((sum / count) * 10.0) / 10.0;
                if (latestDate != null) {
                    latestTime = latestDate.format(dtf);
                }
            }

            String spHinhAnh = "";
            List<SanPhamChiTiet> cts = sanPhamChiTietRepository.findBySanPhamId(sp.getId());
            if (cts != null) {
                for (SanPhamChiTiet ct : cts) {
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
            for (DanhGia d : prodReviews) {
                reviewsList.add(convertToMap(d));
            }
            reviewsList.sort((a, b) -> {
                String da = (String) a.get("ngayTaoIso");
                String db = (String) b.get("ngayTaoIso");
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
            if (countA != countB) {
                return Integer.compare(countB, countA);
            }
            String dateA = (String) a.get("latestDateIso");
            String dateB = (String) b.get("latestDateIso");
            return dateB.compareTo(dateA);
        });

        return result;
    }

    @Override
    public Map<String, Object> analyzeProductReviews(Long productId) {
        SanPham sp = sanPhamRepository.findById(productId).orElse(null);
        if (sp == null) return null;

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
        return resp;
    }

    @Override
    public Map<String, Object> getStats() {
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
        return stats;
    }

    @Override
    public DanhGia replyReview(Long id, String phanHoi, String nguoiPhanHoi) {
        return danhGiaRepository.findById(id).map(dg -> {
            dg.setPhanHoi(phanHoi);
            dg.setNguoiPhanHoi(nguoiPhanHoi != null && !nguoiPhanHoi.isBlank() ? nguoiPhanHoi : "Shop VShoes");
            dg.setNgayPhanHoi(LocalDateTime.now());
            return danhGiaRepository.save(dg);
        }).orElseThrow(() -> new RuntimeException("Không tìm thấy đánh giá id=" + id));
    }

    @Override
    public DanhGia toggleVisibility(Long id) {
        return danhGiaRepository.findById(id).map(dg -> {
            int cur = dg.getTrangThai() != null ? dg.getTrangThai() : 1;
            dg.setTrangThai(cur == 1 ? 0 : 1);
            return danhGiaRepository.save(dg);
        }).orElseThrow(() -> new RuntimeException("Không tìm thấy đánh giá id=" + id));
    }

    @Override
    public void deleteReview(Long id) {
        if (!danhGiaRepository.existsById(id)) {
            throw new RuntimeException("Không tìm thấy đánh giá id=" + id);
        }
        danhGiaRepository.deleteById(id);
    }

    @Override
    public Map<String, Object> checkReviewed(Long hoaDonId) {
        boolean daDanhGia = danhGiaRepository.existsByHoaDon_Id(hoaDonId);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("daDanhGia", daDanhGia);
        if (daDanhGia) {
            danhGiaRepository.findByHoaDon_Id(hoaDonId).ifPresent(dg -> {
                result.put("soSao", dg.getSoSao());
                result.put("noiDung", dg.getNoiDung());
                result.put("ngayTao", dg.getNgayTao());
                result.put("anhDanhGia", dg.getAnhDanhGia());
            });
        }
        return result;
    }

    @Override
    public Map<String, Object> checkBatchReviewed(List<Integer> ids) {
        Map<String, Object> result = new LinkedHashMap<>();
        if (ids != null) {
            for (Integer id : ids) {
                Map<String, Object> item = new LinkedHashMap<>();
                boolean exists = danhGiaRepository.existsByHoaDon_Id(id.longValue());
                item.put("daDanhGia", exists);
                if (exists) {
                    danhGiaRepository.findByHoaDon_Id(id.longValue()).ifPresent(dg -> {
                        item.put("soSao", dg.getSoSao());
                        item.put("noiDung", dg.getNoiDung());
                    });
                }
                result.put(String.valueOf(id), item);
            }
        }
        return result;
    }

    @Override
    public List<Map<String, Object>> getClientReviewsByProduct(Long sanPhamId) {
        Long targetSanPhamId = null;

        Optional<SanPhamChiTiet> spctOpt = sanPhamChiTietRepository.findById(sanPhamId);
        if (spctOpt.isPresent() && spctOpt.get().getSanPham() != null) {
            targetSanPhamId = spctOpt.get().getSanPham().getId();
        } else {
            Optional<SanPham> spOpt = sanPhamRepository.findById(sanPhamId);
            if (spOpt.isPresent()) {
                targetSanPhamId = spOpt.get().getId();
            }
        }

        if (targetSanPhamId == null) {
            return Collections.emptyList();
        }

        List<DanhGia> allReviews = danhGiaRepository.findAll();
        List<DanhGia> matchedList = new ArrayList<>();

        for (DanhGia d : allReviews) {
            if (d.getTrangThai() != null && d.getTrangThai() != 1) continue;
            boolean matched = false;
            if (d.getSanPham() != null && targetSanPhamId.equals(d.getSanPham().getId())) {
                matched = true;
            }
            if (!matched && d.getSanPham() == null && d.getHoaDon() != null) {
                List<ChiTietHoaDon> items = chiTietHoaDonRepository.findByHoaDonId(d.getHoaDon().getId());
                for (ChiTietHoaDon item : items) {
                    if (item.getSanPhamChiTiet() != null && item.getSanPhamChiTiet().getSanPham() != null) {
                        if (targetSanPhamId.equals(item.getSanPhamChiTiet().getSanPham().getId())) {
                            matched = true;
                            d.setSanPham(item.getSanPhamChiTiet().getSanPham());
                            danhGiaRepository.save(d);
                            break;
                        }
                    }
                }
            }
            if (matched && !matchedList.contains(d)) {
                matchedList.add(d);
            }
        }

        matchedList.sort((a, b) -> {
            if (a.getNgayTao() == null) return 1;
            if (b.getNgayTao() == null) return -1;
            return b.getNgayTao().compareTo(a.getNgayTao());
        });

        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        List<Map<String, Object>> result = new ArrayList<>();

        for (DanhGia d : matchedList) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", d.getId());
            m.put("author", (d.getTenHienThi() != null && !d.getTenHienThi().isBlank()) 
                    ? d.getTenHienThi() 
                    : (d.getKhachHang() != null ? d.getKhachHang().getHoTen() : "Khách hàng"));
            m.put("rating", d.getSoSao());
            m.put("soSao", d.getSoSao());
            m.put("text", d.getNoiDung());
            m.put("noiDung", d.getNoiDung());
            m.put("date", d.getNgayTao() != null ? d.getNgayTao().format(dtf) : "Vừa xong");
            m.put("verified", d.getHoaDon() != null || d.getKhachHang() != null);

            List<String> images = new ArrayList<>();
            if (d.getAnhDanhGia() != null && !d.getAnhDanhGia().isBlank()) {
                String raw = d.getAnhDanhGia().trim();
                if (raw.startsWith("[") && raw.endsWith("]")) {
                    raw = raw.substring(1, raw.length() - 1);
                    String[] parts = raw.split(",");
                    for (String p : parts) {
                        String img = p.trim().replaceAll("^\"|\"$", "");
                        if (!img.isBlank()) images.add(img);
                    }
                } else if (!raw.isBlank()) {
                    images.add(raw);
                }
            }
            m.put("images", images);
            m.put("anhDanhGia", images);
            m.put("phanHoi", d.getPhanHoi());
            m.put("ngayPhanHoi", d.getNgayPhanHoi() != null ? d.getNgayPhanHoi().format(dtf) : null);
            m.put("nguoiPhanHoi", d.getNguoiPhanHoi() != null ? d.getNguoiPhanHoi() : "Shop VShoes");
            result.add(m);
        }

        return result;
    }

    @Override
    public Map<String, Map<String, Object>> getSummaryAll() {
        List<DanhGia> allReviews = danhGiaRepository.findAll();
        Map<Long, List<Integer>> spStars = new HashMap<>();

        for (DanhGia d : allReviews) {
            if (d.getTrangThai() != null && d.getTrangThai() != 1) continue;
            int stars = (d.getSoSao() != null && d.getSoSao() >= 1 && d.getSoSao() <= 5) ? d.getSoSao() : 5;
            Set<Long> matchedSpIds = new HashSet<>();

            if (d.getSanPham() != null) {
                matchedSpIds.add(d.getSanPham().getId());
            }

            if (d.getHoaDon() != null) {
                List<ChiTietHoaDon> items = chiTietHoaDonRepository.findByHoaDonId(d.getHoaDon().getId());
                for (ChiTietHoaDon item : items) {
                    if (item.getSanPhamChiTiet() != null && item.getSanPhamChiTiet().getSanPham() != null) {
                        matchedSpIds.add(item.getSanPhamChiTiet().getSanPham().getId());
                    }
                }
            }

            for (Long spId : matchedSpIds) {
                spStars.computeIfAbsent(spId, k -> new ArrayList<>()).add(stars);
            }
        }

        Map<String, Map<String, Object>> summaryMap = new LinkedHashMap<>();
        for (Map.Entry<Long, List<Integer>> entry : spStars.entrySet()) {
            Long spId = entry.getKey();
            List<Integer> list = entry.getValue();
            int count = list.size();
            double avg = count > 0 ? list.stream().mapToInt(Integer::intValue).average().orElse(5.0) : 5.0;
            String avgStr = String.format(Locale.US, "%.1f", avg);

            Map<String, Object> data = new LinkedHashMap<>();
            data.put("rating", avg);
            data.put("danhGia", avgStr);
            data.put("count", count);
            data.put("soLuotDanhGia", count);

            summaryMap.put("sp_" + spId, data);
            summaryMap.put(String.valueOf(spId), data);

            List<SanPhamChiTiet> spcts = sanPhamChiTietRepository.findBySanPhamId(spId);
            if (spcts != null) {
                for (SanPhamChiTiet spct : spcts) {
                    summaryMap.put("spct_" + spct.getId(), data);
                    summaryMap.put(String.valueOf(spct.getId()), data);
                }
            }
        }
        return summaryMap;
    }

    @Override
    @Transactional
    public DanhGia createReview(Map<String, Object> payload, KhachHang sessionUser) {
        Long hoaDonId = ((Number) payload.get("hoaDonId")).longValue();
        Integer soSao = ((Number) payload.get("soSao")).intValue();
        String noiDung = payload.get("noiDung") != null ? payload.get("noiDung").toString().trim() : "";
        String tenHienThi = payload.get("tenHienThi") != null ? payload.get("tenHienThi").toString().trim() : "";

        if (soSao < 1 || soSao > 5) {
            throw new IllegalArgumentException("Số sao phải từ 1 đến 5!");
        }

        HoaDon hoaDon = hoaDonRepository.findById(hoaDonId).orElse(null);
        if (hoaDon == null) {
            throw new IllegalArgumentException("Không tìm thấy đơn hàng!");
        }
        if (hoaDon.getTrangThai() == null || hoaDon.getTrangThai() != 6) {
            throw new IllegalStateException("Chỉ đơn hàng đã hoàn thành mới có thể đánh giá!");
        }
        if (danhGiaRepository.existsByHoaDon_Id(hoaDonId)) {
            throw new IllegalStateException("Đơn hàng này đã được đánh giá rồi!");
        }

        List<SanPham> sanPhamList = new ArrayList<>();
        if (payload.get("sanPhamId") != null) {
            Long spId = ((Number) payload.get("sanPhamId")).longValue();
            sanPhamRepository.findById(spId).ifPresent(sanPhamList::add);
            if (sanPhamList.isEmpty()) {
                sanPhamChiTietRepository.findById(spId).ifPresent(spct -> {
                    if (spct.getSanPham() != null) sanPhamList.add(spct.getSanPham());
                });
            }
        }

        if (sanPhamList.isEmpty()) {
            List<ChiTietHoaDon> items = chiTietHoaDonRepository.findByHoaDonId(hoaDonId);
            for (ChiTietHoaDon item : items) {
                if (item.getSanPhamChiTiet() != null && item.getSanPhamChiTiet().getSanPham() != null) {
                    SanPham sp = item.getSanPhamChiTiet().getSanPham();
                    if (!sanPhamList.contains(sp)) {
                        sanPhamList.add(sp);
                    }
                }
            }
        }

        KhachHang khachHang = sessionUser;
        if (khachHang == null && hoaDon.getKhachHang() != null) {
            khachHang = hoaDon.getKhachHang();
        }

        if (tenHienThi.isBlank()) {
            if (khachHang != null && khachHang.getHoTen() != null && !khachHang.getHoTen().isBlank()) {
                tenHienThi = khachHang.getHoTen();
            } else if (hoaDon.getTenNguoiNhan() != null && !hoaDon.getTenNguoiNhan().isBlank()) {
                tenHienThi = hoaDon.getTenNguoiNhan();
            } else {
                tenHienThi = "Khách hàng VHOES";
            }
        }

        String anhDanhGiaJson = null;
        @SuppressWarnings("unchecked")
        List<String> anhBase64List = (List<String>) payload.get("anhBase64List");
        if (anhBase64List != null && !anhBase64List.isEmpty()) {
            List<String> savedUrls = new ArrayList<>();
            int count = Math.min(anhBase64List.size(), MAX_IMAGES);
            for (int i = 0; i < count; i++) {
                String base64 = anhBase64List.get(i);
                if (base64 == null || base64.isBlank()) continue;
                String url = saveBase64Image(base64, hoaDonId, i);
                if (url != null) savedUrls.add(url);
            }
            if (!savedUrls.isEmpty()) {
                StringBuilder sb = new StringBuilder("[");
                for (int i = 0; i < savedUrls.size(); i++) {
                    if (i > 0) sb.append(",");
                    sb.append("\"").append(savedUrls.get(i)).append("\"");
                }
                sb.append("]");
                anhDanhGiaJson = sb.toString();
            }
        }

        SanPham primarySp = !sanPhamList.isEmpty() ? sanPhamList.get(0) : null;
        DanhGia danhGia = DanhGia.builder()
                .hoaDon(hoaDon)
                .sanPham(primarySp)
                .khachHang(khachHang)
                .soSao(soSao)
                .noiDung(noiDung)
                .anhDanhGia(anhDanhGiaJson)
                .tenHienThi(tenHienThi)
                .ngayTao(LocalDateTime.now())
                .trangThai(1)
                .build();

        DanhGia saved = danhGiaRepository.save(danhGia);

        for (int i = 1; i < sanPhamList.size(); i++) {
            DanhGia extra = DanhGia.builder()
                    .hoaDon(hoaDon)
                    .sanPham(sanPhamList.get(i))
                    .khachHang(khachHang)
                    .soSao(soSao)
                    .noiDung(noiDung)
                    .anhDanhGia(anhDanhGiaJson)
                    .tenHienThi(tenHienThi)
                    .ngayTao(LocalDateTime.now())
                    .trangThai(1)
                    .build();
            danhGiaRepository.save(extra);
        }

        return saved;
    }

    @Override
    public DanhGia createDirectReview(Map<String, Object> payload, KhachHang sessionUser) {
        Long id = ((Number) payload.get("sanPhamId")).longValue();
        Integer soSao = ((Number) payload.get("soSao")).intValue();
        String noiDung = payload.get("noiDung") != null ? payload.get("noiDung").toString().trim() : "";
        String tenHienThi = payload.get("tenHienThi") != null ? payload.get("tenHienThi").toString().trim() : "";

        if (soSao < 1 || soSao > 5) {
            throw new IllegalArgumentException("Số sao phải từ 1 đến 5!");
        }
        if (noiDung.isBlank()) {
            throw new IllegalArgumentException("Vui lòng nhập nội dung đánh giá!");
        }

        SanPham sanPham = sanPhamRepository.findById(id).orElse(null);
        if (sanPham == null) {
            SanPhamChiTiet spct = sanPhamChiTietRepository.findById(id).orElse(null);
            if (spct != null && spct.getSanPham() != null) {
                sanPham = spct.getSanPham();
            }
        }
        if (sanPham == null) {
            throw new IllegalArgumentException("Không tìm thấy sản phẩm!");
        }

        if (tenHienThi.isBlank()) {
            tenHienThi = (sessionUser != null && sessionUser.getHoTen() != null) ? sessionUser.getHoTen() : "Khách hàng VHOES";
        }

        DanhGia danhGia = DanhGia.builder()
                .sanPham(sanPham)
                .khachHang(sessionUser)
                .soSao(soSao)
                .noiDung(noiDung)
                .tenHienThi(tenHienThi)
                .ngayTao(LocalDateTime.now())
                .trangThai(1)
                .build();

        return danhGiaRepository.save(danhGia);
    }

    private String saveBase64Image(String base64Data, Long hoaDonId, int index) {
        try {
            String ext = ".jpg";
            String rawBase64 = base64Data;
            if (base64Data.contains(",")) {
                String meta = base64Data.substring(0, base64Data.indexOf(","));
                rawBase64 = base64Data.substring(base64Data.indexOf(",") + 1);
                if (meta.contains("png")) ext = ".png";
                else if (meta.contains("webp")) ext = ".webp";
                else if (meta.contains("gif")) ext = ".gif";
            }
            byte[] bytes = Base64.getDecoder().decode(rawBase64.trim());
            if (bytes.length > MAX_SIZE_BYTES) return null;

            String fileName = "review_hd" + hoaDonId + "_" + System.currentTimeMillis() + "_" + index + ext;
            Path pathSrc = Paths.get(UPLOAD_DIR, fileName);
            Files.createDirectories(pathSrc.getParent());
            Files.write(pathSrc, bytes);

            try {
                Path pathTarget = Paths.get(UPLOAD_DIR_TARGET, fileName);
                Files.createDirectories(pathTarget.getParent());
                Files.write(pathTarget, bytes);
            } catch (Exception ignored) {}

            return "/upload/" + fileName;
        } catch (Exception e) {
            return null;
        }
    }

    private Map<String, Object> convertToMap(DanhGia d) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", d.getId());
        m.put("soSao", d.getSoSao() != null ? d.getSoSao() : 5);
        m.put("noiDung", d.getNoiDung() != null ? d.getNoiDung() : "");
        m.put("anhDanhGia", d.getAnhDanhGia() != null ? d.getAnhDanhGia() : "[]");
        m.put("phanHoi", d.getPhanHoi());
        m.put("nguoiPhanHoi", d.getNguoiPhanHoi());
        m.put("ngayPhanHoi", d.getNgayPhanHoi() != null ? d.getNgayPhanHoi().format(FMT) : null);
        m.put("trangThai", d.getTrangThai() != null ? d.getTrangThai() : 1);
        m.put("ngayTao", d.getNgayTao() != null ? d.getNgayTao().format(FMT) : "");
        m.put("ngayTaoIso", d.getNgayTao() != null ? d.getNgayTao().toString() : "");

        String ten = d.getTenHienThi();
        if (ten == null || ten.isBlank()) {
            if (d.getKhachHang() != null && d.getKhachHang().getHoTen() != null) {
                ten = d.getKhachHang().getHoTen();
            } else if (d.getHoaDon() != null && d.getHoaDon().getTenNguoiNhan() != null) {
                ten = d.getHoaDon().getTenNguoiNhan();
            } else {
                ten = "Khách hàng VHOES";
            }
        }
        m.put("tenKhachHang", ten);

        if (d.getSanPham() != null) {
            m.put("sanPhamId", d.getSanPham().getId());
            m.put("tenSanPham", d.getSanPham().getTenSanPham());
            m.put("maSanPham", d.getSanPham().getMaSanPham());
        } else if (d.getHoaDon() != null) {
            List<ChiTietHoaDon> cthds = chiTietHoaDonRepository.findByHoaDonId(d.getHoaDon().getId());
            if (cthds != null && !cthds.isEmpty() && cthds.get(0).getSanPhamChiTiet() != null && cthds.get(0).getSanPhamChiTiet().getSanPham() != null) {
                SanPham sp = cthds.get(0).getSanPhamChiTiet().getSanPham();
                m.put("sanPhamId", sp.getId());
                m.put("tenSanPham", sp.getTenSanPham());
                m.put("maSanPham", sp.getMaSanPham());
            } else {
                m.put("sanPhamId", null);
                m.put("tenSanPham", "Đơn hàng #" + d.getHoaDon().getId());
                m.put("maSanPham", d.getHoaDon().getMaHoaDon());
            }
        } else {
            m.put("sanPhamId", null);
            m.put("tenSanPham", "Sản phẩm");
            m.put("maSanPham", "");
        }

        if (d.getHoaDon() != null) {
            m.put("hoaDonId", d.getHoaDon().getId());
            m.put("maHoaDon", d.getHoaDon().getMaHoaDon());
        } else {
            m.put("hoaDonId", null);
            m.put("maHoaDon", null);
        }

        return m;
    }
}
