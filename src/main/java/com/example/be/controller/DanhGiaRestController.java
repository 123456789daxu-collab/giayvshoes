package com.example.be.controller;

import com.example.be.entity.ChiTietHoaDon;
import com.example.be.entity.DanhGia;
import com.example.be.entity.HoaDon;
import com.example.be.entity.KhachHang;
import com.example.be.entity.SanPham;
import com.example.be.entity.SanPhamChiTiet;
import com.example.be.repository.ChiTietHoaDonRepository;
import com.example.be.repository.DanhGiaRepository;
import com.example.be.repository.HoaDonRepository;
import com.example.be.repository.SanPhamChiTietRepository;
import com.example.be.repository.SanPhamRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpSession;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * API đánh giá sản phẩm.
 * - Cho phép đánh giá từ đơn hàng hoàn thành (mỗi đơn 1 lần duy nhất).
 * - Cho phép đánh giá trực tiếp từ trang chi tiết sản phẩm.
 * - Trả về danh sách đánh giá thực tế từ cơ sở dữ liệu.
 */
@RestController
@RequestMapping("/api/auth/danh-gia")
public class DanhGiaRestController {

    @Autowired private DanhGiaRepository          danhGiaRepository;
    @Autowired private HoaDonRepository            hoaDonRepository;
    @Autowired private SanPhamRepository           sanPhamRepository;
    @Autowired private SanPhamChiTietRepository     sanPhamChiTietRepository;
    @Autowired private ChiTietHoaDonRepository     chiTietHoaDonRepository;

    private static final String UPLOAD_DIR        = "src/main/resources/static/upload/";
    private static final String UPLOAD_DIR_TARGET = "target/classes/static/upload/";
    private static final int    MAX_IMAGES        = 5;
    private static final long   MAX_SIZE_BYTES    = 5 * 1024 * 1024; // 5 MB mỗi ảnh

    // ──────────────────────────────────────────────────────────
    // CHECK ĐÃ ĐÁNH GIÁ (THEO ĐƠN HÀNG)
    // ──────────────────────────────────────────────────────────

    /** GET /api/auth/danh-gia/check/{hoaDonId} */
    @GetMapping("/check/{hoaDonId}")
    public ResponseEntity<?> check(@PathVariable Long hoaDonId) {
        boolean daDanhGia = danhGiaRepository.existsByHoaDon_Id(hoaDonId);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("daDanhGia", daDanhGia);
        if (daDanhGia) {
            danhGiaRepository.findByHoaDon_Id(hoaDonId).ifPresent(dg -> {
                result.put("soSao",      dg.getSoSao());
                result.put("noiDung",    dg.getNoiDung());
                result.put("ngayTao",    dg.getNgayTao());
                result.put("anhDanhGia", dg.getAnhDanhGia());
            });
        }
        return ResponseEntity.ok(result);
    }

    /** POST /api/auth/danh-gia/check-batch — Body: { "hoaDonIds": [1,2,3] } */
    @PostMapping("/check-batch")
    public ResponseEntity<?> checkBatch(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Integer> ids = (List<Integer>) body.get("hoaDonIds");
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
        return ResponseEntity.ok(result);
    }

    // ──────────────────────────────────────────────────────────
    // SUBMIT ĐÁNH GIÁ TỪ ĐƠN HÀNG (có thể kèm tối đa 5 ảnh base64)
    // ──────────────────────────────────────────────────────────

    /**
     * POST /api/auth/danh-gia/submit
     */
    @PostMapping("/submit")
    public ResponseEntity<?> submit(@RequestBody Map<String, Object> payload,
                                    HttpSession session) {
        try {
            Long    hoaDonId    = ((Number) payload.get("hoaDonId")).longValue();
            Integer soSao       = ((Number) payload.get("soSao")).intValue();
            String  noiDung     = payload.get("noiDung")     != null ? payload.get("noiDung").toString().trim()     : "";
            String  tenHienThi  = payload.get("tenHienThi")  != null ? payload.get("tenHienThi").toString().trim()  : "";

            // Validate số sao
            if (soSao < 1 || soSao > 5) {
                return ResponseEntity.badRequest().body(Map.of("error", "Số sao phải từ 1 đến 5!"));
            }

            // Kiểm tra đơn hàng tồn tại
            HoaDon hoaDon = hoaDonRepository.findById(hoaDonId).orElse(null);
            if (hoaDon == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Không tìm thấy đơn hàng!"));
            }
            // Chỉ Hoàn thành (6) mới đánh giá được
            if (hoaDon.getTrangThai() == null || hoaDon.getTrangThai() != 6) {
                return ResponseEntity.badRequest().body(Map.of("error", "Chỉ đơn hàng đã hoàn thành mới có thể đánh giá!"));
            }
            // Mỗi đơn hàng chỉ 1 lần
            if (danhGiaRepository.existsByHoaDon_Id(hoaDonId)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Đơn hàng này đã được đánh giá rồi!"));
            }

            // Xác định danh sách sản phẩm trong đơn hàng
            List<SanPham> sanPhamList = new ArrayList<>();
            if (payload.get("sanPhamId") != null) {
                Long spId = ((Number) payload.get("sanPhamId")).longValue();
                sanPhamRepository.findById(spId).ifPresent(sanPhamList::add);
                if (sanPhamList.isEmpty()) {
                    sanPhamChiTietRepository.findById(spId)
                            .ifPresent(spct -> {
                                if (spct.getSanPham() != null) sanPhamList.add(spct.getSanPham());
                            });
                }
            }

            if (sanPhamList.isEmpty()) {
                // Tự động tìm tất cả sản phẩm từ chi tiết hóa đơn
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

            // Lấy thông tin khách hàng từ session hoặc đơn hàng
            KhachHang khachHang = (KhachHang) session.getAttribute("clientUser");
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

            // ── Xử lý ảnh base64 ──
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

            // Lưu đánh giá: Nếu có sản phẩm, lưu liên kết với sản phẩm đầu tiên hoặc tạo bản ghi
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

            // Nếu đơn hàng có thêm sản phẩm khác, tạo liên kết cho các sản phẩm còn lại
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

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("success", true);
            resp.put("message", "Cảm ơn bạn đã đánh giá sản phẩm!");
            resp.put("id", saved.getId());
            resp.put("anhDanhGia", anhDanhGiaJson);
            return ResponseEntity.ok(resp);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Đã có lỗi xảy ra: " + e.getMessage()));
        }
    }

    // ──────────────────────────────────────────────────────────
    // SUBMIT ĐÁNH GIÁ TRỰC TIẾP TỪ TRANG SẢN PHẨM
    // ──────────────────────────────────────────────────────────

    /**
     * POST /api/auth/danh-gia/submit-direct
     */
    @PostMapping("/submit-direct")
    public ResponseEntity<?> submitDirect(@RequestBody Map<String, Object> payload,
                                          HttpSession session) {
        try {
            Long    id         = ((Number) payload.get("sanPhamId")).longValue();
            Integer soSao      = ((Number) payload.get("soSao")).intValue();
            String  noiDung    = payload.get("noiDung")    != null ? payload.get("noiDung").toString().trim()    : "";
            String  tenHienThi = payload.get("tenHienThi") != null ? payload.get("tenHienThi").toString().trim() : "";

            if (soSao < 1 || soSao > 5) {
                return ResponseEntity.badRequest().body(Map.of("error", "Số sao phải từ 1 đến 5!"));
            }
            if (noiDung.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Vui lòng nhập nội dung đánh giá!"));
            }

            // Tìm SanPham gốc
            SanPham sanPham = sanPhamRepository.findById(id).orElse(null);
            if (sanPham == null) {
                SanPhamChiTiet spct = sanPhamChiTietRepository.findById(id).orElse(null);
                if (spct != null && spct.getSanPham() != null) {
                    sanPham = spct.getSanPham();
                }
            }

            if (sanPham == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Không tìm thấy sản phẩm!"));
            }

            KhachHang khachHang = (KhachHang) session.getAttribute("clientUser");
            if (tenHienThi.isBlank()) {
                tenHienThi = (khachHang != null && khachHang.getHoTen() != null) ? khachHang.getHoTen() : "Khách hàng VHOES";
            }

            DanhGia danhGia = DanhGia.builder()
                    .sanPham(sanPham)
                    .khachHang(khachHang)
                    .soSao(soSao)
                    .noiDung(noiDung)
                    .tenHienThi(tenHienThi)
                    .ngayTao(LocalDateTime.now())
                    .trangThai(1)
                    .build();

            danhGiaRepository.save(danhGia);
            return ResponseEntity.ok(Map.of("success", true, "message", "Đã gửi đánh giá thành công!"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ──────────────────────────────────────────────────────────
    // LẤY DANH SÁCH ĐÁNH GIÁ THEO SẢN PHẨM (CÔNG KHAI)
    // ──────────────────────────────────────────────────────────

    /**
     * GET /api/auth/danh-gia/san-pham/{id}
     * Nhận ID (có thể là SanPhamId hoặc SanPhamChiTietId)
     */
    @GetMapping("/san-pham/{id}")
    public ResponseEntity<?> getBySanPham(@PathVariable Long id) {
        Long targetSanPhamId = null;

        Optional<SanPhamChiTiet> spctOpt = sanPhamChiTietRepository.findById(id);
        if (spctOpt.isPresent() && spctOpt.get().getSanPham() != null) {
            targetSanPhamId = spctOpt.get().getSanPham().getId();
        } else {
            Optional<SanPham> spOpt = sanPhamRepository.findById(id);
            if (spOpt.isPresent()) {
                targetSanPhamId = spOpt.get().getId();
            }
        }

        if (targetSanPhamId == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        // Lấy đánh giá khớp với targetSanPhamId
        List<DanhGia> allReviews = danhGiaRepository.findAll();
        List<DanhGia> matchedList = new ArrayList<>();

        for (DanhGia d : allReviews) {
            if (d.getTrangThai() != null && d.getTrangThai() != 1) continue;

            boolean matched = false;
            // Khớp theo sanPham
            if (d.getSanPham() != null && targetSanPhamId.equals(d.getSanPham().getId())) {
                matched = true;
            }

            // Khớp theo các sản phẩm có trong hóa đơn (chỉ khi d.sanPham == null)
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

        // Sắp xếp mới nhất lên đầu
        matchedList.sort((a, b) -> {
            if (a.getNgayTao() == null) return 1;
            if (b.getNgayTao() == null) return -1;
            return b.getNgayTao().compareTo(a.getNgayTao());
        });

        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

        List<Map<String, Object>> result = matchedList.stream().map(d -> {
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
            
            // Parse ảnh đánh giá
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

            // Phản hồi từ người bán
            m.put("phanHoi", d.getPhanHoi());
            m.put("ngayPhanHoi", d.getNgayPhanHoi() != null ? d.getNgayPhanHoi().format(dtf) : null);
            m.put("nguoiPhanHoi", d.getNguoiPhanHoi() != null ? d.getNguoiPhanHoi() : "Shop VShoes");

            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // ──────────────────────────────────────────────────────────
    // TỔNG HỢP ĐIỂM ĐÁNH GIÁ VÀ SỐ LƯỢT ĐÁNH GIÁ CHO TOÀN BỘ SẢN PHẨM
    // ──────────────────────────────────────────────────────────

    /**
     * GET /api/auth/danh-gia/summary-all
     * Trả về Map<String, Map<String, Object>> với key là spId hoặc spctId
     * Value: { "rating": 5.0, "count": 1, "danhGia": "5.0", "soLuotDanhGia": 1 }
     */
    @GetMapping("/summary-all")
    public ResponseEntity<?> getSummaryAll() {
        List<DanhGia> allReviews = danhGiaRepository.findAll().stream()
                .filter(d -> d.getTrangThai() == null || d.getTrangThai() == 1)
                .collect(Collectors.toList());

        // Map lưu danh sách số sao theo SanPhamId
        Map<Long, List<Integer>> spStars = new HashMap<>();

        for (DanhGia d : allReviews) {
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

        // Tạo map kết quả
        Map<String, Map<String, Object>> summaryMap = new LinkedHashMap<>();

        // 1. Gán theo SanPhamId
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

            // 2. Gán cho tất cả các SPCT thuộc sản phẩm này
            List<SanPhamChiTiet> spcts = sanPhamChiTietRepository.findBySanPhamId(spId);
            if (spcts != null) {
                for (SanPhamChiTiet spct : spcts) {
                    summaryMap.put("spct_" + spct.getId(), data);
                    summaryMap.put(String.valueOf(spct.getId()), data);
                }
            }
        }

        return ResponseEntity.ok(summaryMap);
    }

    // ──────────────────────────────────────────────────────────
    // HELPER: lưu base64 → file
    // ──────────────────────────────────────────────────────────

    private String saveBase64Image(String base64Data, Long hoaDonId, int index) {
        try {
            String raw = base64Data;
            String ext = "jpg";
            if (base64Data.startsWith("data:")) {
                int comma = base64Data.indexOf(',');
                if (comma < 0) return null;
                String header = base64Data.substring(5, comma);
                if (header.contains("png"))  ext = "png";
                else if (header.contains("gif")) ext = "gif";
                else if (header.contains("webp")) ext = "webp";
                raw = base64Data.substring(comma + 1);
            }

            raw = raw.replace(" ", "+").trim();
            byte[] bytes = Base64.getDecoder().decode(raw);
            if (bytes.length > MAX_SIZE_BYTES) return null;

            String fileName = "dg_" + hoaDonId + "_" + index + "_" + System.currentTimeMillis() + "." + ext;

            Path srcPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(srcPath)) Files.createDirectories(srcPath);
            Files.write(srcPath.resolve(fileName), bytes);

            Path tgtPath = Paths.get(UPLOAD_DIR_TARGET);
            if (!Files.exists(tgtPath)) Files.createDirectories(tgtPath);
            Files.write(tgtPath.resolve(fileName), bytes);

            return "/upload/" + fileName;
        } catch (Exception e) {
            System.err.println("Lỗi lưu ảnh đánh giá: " + e.getMessage());
            return null;
        }
    }
}
