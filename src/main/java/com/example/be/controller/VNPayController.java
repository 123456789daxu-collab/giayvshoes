package com.example.be.controller;

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
            String orderId   = Objects.toString(body.get("orderId"),   "");
            String orderCode = Objects.toString(body.get("orderCode"), orderId);
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
                // Thanh toán thành công — cập nhật trạng thái đơn hàng
                try {
                    hoaDonService.confirmVNPayPayment(txnRef, transNo, paidAmount);
                } catch (Exception ex) {
                    return ResponseEntity.ok(Map.of("RspCode", "01", "Message", "Order not found"));
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
