package com.example.be.controller;

import com.example.be.entity.ChiTietHoaDon;
import com.example.be.entity.HoaDon;
import com.example.be.entity.SanPhamChiTiet;
import com.example.be.repository.ChiTietHoaDonRepository;
import com.example.be.repository.HoaDonRepository;
import com.example.be.repository.SanPhamChiTietRepository;
import com.example.be.service.HoaDonService;
import com.example.be.service.VNPayService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * VNPay Payment Controller
 * - POST /api/payment/vnpay/create  → tạo URL redirect sang VNPay
 * - GET  /api/payment/vnpay/ipn     → nhận IPN (Instant Payment Notification) từ VNPay server-to-server
 */
@RestController
@RequestMapping("/api/payment/vnpay")
public class VNPayController {

    @Autowired
    private VNPayService vnPayService;

    @Autowired
    private HoaDonService hoaDonService;

    @Autowired
    private HoaDonRepository hoaDonRepository;

    @Autowired
    private ChiTietHoaDonRepository chiTietHoaDonRepository;

    @Autowired
    private SanPhamChiTietRepository sanPhamChiTietRepository;

    /**
     * Tạo URL thanh toán VNPay.
     * Frontend gọi POST với body JSON:
     * {
     *   "orderId": "HD1234567890",
     *   "orderCode": "HD1234567890",
     *   "amount": 1950000,
     *   "orderInfo": "Thanh toan don hang HD1234567890",
     *   "locale": "vn"
     * }
     */
    @PostMapping("/create")
    public ResponseEntity<?> createPayment(@RequestBody Map<String, Object> body,
                                           HttpServletRequest request) {
        try {
            String orderId   = Objects.toString(body.get("orderId"),   "").trim();
            String orderCode = Objects.toString(body.get("orderCode"), orderId).trim();
            String orderInfo = Objects.toString(body.get("orderInfo"), "Thanh toan don hang " + orderId);
            String locale    = Objects.toString(body.get("locale"),    "vn");

            Object amountObj = body.get("amount");
            long amount = 0;
            if (amountObj instanceof Number) {
                amount = ((Number) amountObj).longValue();
            } else if (amountObj != null) {
                amount = Long.parseLong(amountObj.toString().replace(",", "").replace(".", ""));
            }

            if (orderId.isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Thiếu orderId"));
            }
            if (amount <= 0) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Số tiền thanh toán không hợp lệ"));
            }

            // Kiểm tra tồn kho của tất cả sản phẩm trong hóa đơn trước khi tạo link thanh toán VNPay
            HoaDon hd = null;
            if (!orderId.isBlank()) {
                hd = hoaDonRepository.findAll().stream()
                        .filter(h -> orderId.equals(h.getMaHoaDon()))
                        .findFirst()
                        .orElse(null);
                if (hd == null) {
                    try {
                        long id = Long.parseLong(orderId);
                        hd = hoaDonRepository.findById(id).orElse(null);
                    } catch (NumberFormatException ignored) {}
                }
            }

            if (hd != null) {
                List<ChiTietHoaDon> details = chiTietHoaDonRepository.findByHoaDonId(hd.getId());
                if (details != null && !details.isEmpty()) {
                    for (ChiTietHoaDon ct : details) {
                        SanPhamChiTiet spct = ct.getSanPhamChiTiet();
                        if (spct != null) {
                            spct = sanPhamChiTietRepository.findById(spct.getId()).orElse(spct);
                            int stock = spct.getSoLuongTon() != null ? spct.getSoLuongTon() : 0;
                            int qty = ct.getSoLuong() != null ? ct.getSoLuong() : 0;

                            boolean isProductActive = (spct.getSanPham() == null || spct.getSanPham().getTrangThai() == null || spct.getSanPham().getTrangThai() == 1);
                            boolean isVariantActive = (spct.getTrangThai() != null && spct.getTrangThai() == 1);

                            String tenSp = (spct.getSanPham() != null) ? spct.getSanPham().getTenSanPham() : "Sản phẩm";
                            String mauSac = (spct.getMauSac() != null) ? spct.getMauSac().getTenMauSac() : "";
                            String coGiay = (spct.getCoGiay() != null) ? String.valueOf(spct.getCoGiay().getSizeGiay()) : "";
                            String variant = (!mauSac.isEmpty() || !coGiay.isEmpty())
                                    ? " [" + mauSac + ((!mauSac.isEmpty() && !coGiay.isEmpty()) ? " - " : "") + coGiay + "]"
                                    : "";

                            if (!isProductActive || !isVariantActive) {
                                return ResponseEntity.badRequest()
                                        .body(Map.of("error", "Sản phẩm '" + tenSp + variant + "' đã ngừng kinh doanh, không thể thanh toán!"));
                            }

                            if (stock < qty) {
                                return ResponseEntity.badRequest()
                                        .body(Map.of("error", "Sản phẩm '" + tenSp + variant + "' không đủ số lượng trong kho (kho còn: " + stock + ", cần: " + qty + ")! Vui lòng chọn sản phẩm khác."));
                            }
                        }
                    }
                }
            }

            // Lấy IP của client
            String ipAddr = request.getHeader("X-Forwarded-For");
            if (ipAddr == null || ipAddr.isBlank()) ipAddr = request.getRemoteAddr();

            String paymentUrl = vnPayService.createPaymentUrl(
                    orderId, orderCode, amount, orderInfo, ipAddr, locale);

            return ResponseEntity.ok(Map.of("paymentUrl", paymentUrl));

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Lỗi tạo URL thanh toán: " + e.getMessage()));
        }
    }

    /**
     * VNPay IPN (Instant Payment Notification) — server-to-server callback.
     * VNPay gọi endpoint này để thông báo kết quả giao dịch.
     */
    @GetMapping("/ipn")
    public ResponseEntity<?> ipnCallback(@RequestParam Map<String, String> params) {
        try {
            boolean validSig = vnPayService.validateSignature(params);
            if (!validSig) {
                return ResponseEntity.ok(Map.of("RspCode", "97", "Message", "Checksum failed"));
            }

            String responseCode = params.getOrDefault("vnp_ResponseCode", "");
            String txnRef       = params.getOrDefault("vnp_TxnRef", "");       // orderId
            String transNo      = params.getOrDefault("vnp_TransactionNo", "");
            String amountStr    = params.getOrDefault("vnp_Amount", "0");
            long   paidAmount   = Long.parseLong(amountStr) / 100;             // VNPay nhân 100

            if ("00".equals(responseCode)) {
                // Thanh toán thành công — kiểm tra số lượng tồn kho trước khi xác nhận
                try {
                    hoaDonService.confirmVNPayPayment(txnRef, transNo, paidAmount);
                } catch (IllegalStateException ex) {
                    return ResponseEntity.ok(Map.of("RspCode", "02", "Message", ex.getMessage()));
                } catch (IllegalArgumentException ex) {
                    return ResponseEntity.ok(Map.of("RspCode", "01", "Message", "Order not found"));
                } catch (Exception ex) {
                    return ResponseEntity.ok(Map.of("RspCode", "99", "Message", ex.getMessage()));
                }
                return ResponseEntity.ok(Map.of("RspCode", "00", "Message", "Confirm Success"));
            } else {
                // Thanh toán thất bại hoặc bị hủy
                return ResponseEntity.ok(Map.of("RspCode", "00", "Message", "Confirm Success"));
            }
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("RspCode", "99", "Message", "Unknown error: " + e.getMessage()));
        }
    }
}
