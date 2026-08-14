package com.example.be.service.impl;

import com.example.be.entity.KhachHang;
import com.example.be.entity.PhieuGiamGia;
import com.example.be.service.EmailService;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.text.DecimalFormat;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.CompletableFuture;

@Service
public class EmailServiceImpl implements EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Autowired
    private TemplateEngine templateEngine;

    @Override
    public void sendVoucherNotification(KhachHang customer, PhieuGiamGia voucher) {
        sendHtmlEmail(
            customer.getEmail(), 
            "[VShoes] Bạn nhận được mã giảm giá cá nhân mới!", 
            "CREATE", 
            customer, 
            voucher
        );
    }

    @Override
    public void sendVoucherUpdateNotification(KhachHang customer, PhieuGiamGia voucher) {
        sendHtmlEmail(
            customer.getEmail(), 
            "[VShoes] Mã giảm giá cá nhân của bạn đã được cập nhật!", 
            "UPDATE", 
            customer, 
            voucher
        );
    }

    @Override
    public void sendVoucherCancelNotification(KhachHang customer, PhieuGiamGia voucher) {
        sendHtmlEmail(
            customer.getEmail(), 
            "[VShoes] Mã giảm giá cá nhân của bạn đã tạm ngừng áp dụng!", 
            "CANCEL", 
            customer, 
            voucher
        );
    }

    private void sendHtmlEmail(String toEmail, String subject, String action, KhachHang customer, PhieuGiamGia voucher) {
        if (toEmail == null || toEmail.trim().isEmpty()) {
            return;
        }

        CompletableFuture.runAsync(() -> {
            try {
                if (mailSender == null) {
                    System.out.println("JavaMailSender is not configured. Simulation HTML email sent to " 
                        + toEmail + " for voucher " + voucher.getMaVoucher() + " (Action: " + action + ")");
                    return;
                }

                DecimalFormat df = new DecimalFormat("#,###");
                
                String formattedGiaTriGiam = "";
                if (voucher.getGiaTriGiam() != null) {
                    if ("Tiền mặt".equalsIgnoreCase(voucher.getLoaiGiamGia())) {
                        formattedGiaTriGiam = df.format(voucher.getGiaTriGiam()) + " VNĐ";
                    } else {
                        formattedGiaTriGiam = String.format("%.0f%%", voucher.getGiaTriGiam().doubleValue());
                        if (voucher.getGiaTriGiam().doubleValue() % 1 != 0) {
                            formattedGiaTriGiam = voucher.getGiaTriGiam().toString() + "%";
                        }
                    }
                }

                String formattedGiamToiDa = "0 VNĐ";
                if (voucher.getGiamToiDa() != null) {
                    formattedGiamToiDa = df.format(voucher.getGiamToiDa()) + " VNĐ";
                }

                String formattedDonToiThieu = "0 VNĐ";
                if (voucher.getDonToiThieu() != null) {
                    formattedDonToiThieu = df.format(voucher.getDonToiThieu()) + " VNĐ";
                }

                DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
                String formattedNgayKetThuc = voucher.getNgayKetThuc() != null 
                    ? voucher.getNgayKetThuc().format(dateFormatter) 
                    : "";
                String formattedNgayBatDau = voucher.getNgayBatDau() != null 
                    ? voucher.getNgayBatDau().format(dateFormatter) 
                    : "";

                Context context = new Context();
                context.setVariable("customerName", customer.getHoTen());
                context.setVariable("voucherCode", voucher.getMaVoucher());
                context.setVariable("voucherName", voucher.getTenVoucher());
                context.setVariable("loaiGiamGia", voucher.getLoaiGiamGia());
                context.setVariable("formattedGiaTriGiam", formattedGiaTriGiam);
                context.setVariable("formattedGiamToiDa", formattedGiamToiDa);
                context.setVariable("formattedDonToiThieu", formattedDonToiThieu);
                context.setVariable("formattedNgayBatDau", formattedNgayBatDau);
                context.setVariable("formattedNgayKetThuc", formattedNgayKetThuc);
                context.setVariable("action", action);

                String htmlContent = templateEngine.process("email-voucher", context);

                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
                
                helper.setTo(toEmail);
                helper.setSubject(subject);
                helper.setText(htmlContent, true);

                mailSender.send(message);
                System.out.println("HTML Email successfully sent to " + toEmail + " (Action: " + action + ")");
            } catch (Exception e) {
                System.err.println("Failed to send HTML email to " + toEmail + " (Action: " + action + "): " + e.getMessage());
                e.printStackTrace();
            }
        });
    }

    @Override
    public void sendInvoiceEmail(com.example.be.dto.HoaDonDTO invoice, java.util.List<java.util.Map<String, Object>> items) {
        if (invoice == null) return;
        
        String toEmail = invoice.getEmail();
        if (toEmail == null || toEmail.trim().isEmpty()) {
            if (invoice.getGhiChu() != null && invoice.getGhiChu().contains("| EMAIL:")) {
                try {
                    String[] parts = invoice.getGhiChu().split("\\| EMAIL:");
                    if (parts.length > 1) {
                        toEmail = parts[1].trim();
                    }
                } catch (Exception ignored) {}
            }
        }

        if (toEmail == null || toEmail.trim().isEmpty() || !toEmail.contains("@")) {
            System.out.println("No valid email address found for invoice " + invoice.getMaHoaDon() + ". Skipping email send.");
            return;
        }

        final String targetEmail = toEmail.trim();

        CompletableFuture.runAsync(() -> {
            try {
                if (mailSender == null) {
                    System.out.println("JavaMailSender is not configured. Simulating HTML invoice email sent to " + targetEmail + " for invoice " + invoice.getMaHoaDon());
                    return;
                }

                DecimalFormat df = new DecimalFormat("#,###");

                // Process items list with formatted prices
                java.util.List<java.util.Map<String, Object>> formattedItems = new java.util.ArrayList<>();
                java.math.BigDecimal subtotal = java.math.BigDecimal.ZERO;

                if (items != null) {
                    for (java.util.Map<String, Object> item : items) {
                        java.util.Map<String, Object> map = new java.util.HashMap<>(item);
                        java.math.BigDecimal price = java.math.BigDecimal.ZERO;
                        Object donGiaObj = item.get("donGia");
                        if (donGiaObj != null) {
                            price = new java.math.BigDecimal(donGiaObj.toString());
                        }

                        int qty = 1;
                        Object qtyObj = item.get("soLuong");
                        if (qtyObj != null) {
                            qty = Integer.parseInt(qtyObj.toString());
                        }

                        java.math.BigDecimal lineTotal = price.multiply(java.math.BigDecimal.valueOf(qty));
                        subtotal = subtotal.add(lineTotal);

                        map.put("formattedDonGia", df.format(price) + " ₫");
                        map.put("formattedThanhTien", df.format(lineTotal) + " ₫");

                        Object mauObj = item.get("tenMauSac");
                        if (mauObj == null) mauObj = item.get("mauSac");
                        Object sizeObj = item.get("sizeGiay");
                        if (sizeObj == null) sizeObj = item.get("coGiay");

                        StringBuilder metaSb = new StringBuilder();
                        if (mauObj != null && !mauObj.toString().isBlank()) {
                            metaSb.append("Màu: ").append(mauObj.toString());
                        }
                        if (sizeObj != null && !sizeObj.toString().isBlank()) {
                            if (metaSb.length() > 0) metaSb.append(" | ");
                            metaSb.append("Size: ").append(sizeObj.toString());
                        }
                        map.put("itemMeta", metaSb.toString());

                        formattedItems.add(map);
                    }
                }


                java.math.BigDecimal shippingFee = invoice.getPhiShip() != null ? invoice.getPhiShip() : java.math.BigDecimal.ZERO;
                java.math.BigDecimal discount = invoice.getTienGiam() != null ? invoice.getTienGiam() : java.math.BigDecimal.ZERO;
                java.math.BigDecimal total = invoice.getTongTien() != null ? invoice.getTongTien() : subtotal.add(shippingFee).subtract(discount);

                DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
                String formattedNgayTao = invoice.getNgayTao() != null ? invoice.getNgayTao().format(dateFormatter) : "";

                // Chuyển mã trạng thái sang text hiển thị
                String trangThaiText = getTrangThaiText(invoice.getTrangThai());

                Context context = new Context();
                context.setVariable("customerName", invoice.getTenKhachHang() != null ? invoice.getTenKhachHang() : "Khách hàng");
                context.setVariable("invoiceCode", invoice.getMaHoaDon() != null ? invoice.getMaHoaDon() : ("HD" + invoice.getId()));
                context.setVariable("customerPhone", invoice.getSdtKhachHang() != null ? invoice.getSdtKhachHang() : "-");
                context.setVariable("shippingAddress", invoice.getDiaChiGiao() != null ? invoice.getDiaChiGiao() : "-");
                context.setVariable("formattedNgayTao", formattedNgayTao);
                context.setVariable("trangThaiText", trangThaiText);
                context.setVariable("items", formattedItems);
                context.setVariable("formattedSubtotal", df.format(subtotal) + " ₫");
                context.setVariable("formattedShippingFee", df.format(shippingFee) + " ₫");
                context.setVariable("hasDiscount", discount.compareTo(java.math.BigDecimal.ZERO) > 0);
                context.setVariable("formattedDiscount", "-" + df.format(discount) + " ₫");
                context.setVariable("formattedTotal", df.format(total) + " ₫");
                context.setVariable("trackingUrl", "http://localhost:8080/client/tra-cuu?code=" + (invoice.getMaHoaDon() != null ? invoice.getMaHoaDon() : ""));

                String htmlContent = templateEngine.process("email-hoa-don", context);

                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

                helper.setTo(targetEmail);
                helper.setSubject("[VShoes] Xác nhận đơn hàng " + (invoice.getMaHoaDon() != null ? invoice.getMaHoaDon() : ""));
                helper.setText(htmlContent, true);

                mailSender.send(message);
                System.out.println("Invoice email successfully sent to " + targetEmail + " for invoice " + invoice.getMaHoaDon());
            } catch (Exception e) {
                System.err.println("Failed to send invoice email to " + targetEmail + ": " + e.getMessage());
                e.printStackTrace();
            }
        });
    }


    @Override
    public void sendCampaignNotification(java.util.List<KhachHang> customers, com.example.be.entity.DotGiamGia campaign, String action) {
        if (customers == null || customers.isEmpty()) return;

        CompletableFuture.runAsync(() -> {
            try {
                if (mailSender == null) {
                    System.out.println("JavaMailSender is not configured. Simulation HTML email sent for campaign " + campaign.getMaDotGiamGia());
                    return;
                }

                DateTimeFormatter Formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
                String formattedNgayKetThuc = campaign.getNgayKetThuc() != null ? campaign.getNgayKetThuc().format(Formatter) : "";
                String formattedNgayBatDau = campaign.getNgayBatDau() != null ? campaign.getNgayBatDau().format(Formatter) : "";
                String formattedPhanTramGiam = campaign.getPhanTramGiam() + "%";
                String subject = action.equals("CREATE") ? "[VShoes] Khuyến mãi siêu khủng đã bắt đầu!" : "[VShoes] Cập nhật chương trình khuyến mãi!";

                for (KhachHang customer : customers) {
                    String toEmail = customer.getEmail();
                    if (toEmail == null || toEmail.trim().isEmpty()) continue;

                    Context context = new Context();
                    context.setVariable("customerName", customer.getHoTen());
                    context.setVariable("campaignName", campaign.getTenDotGiamGia());
                    context.setVariable("formattedPhanTramGiam", formattedPhanTramGiam);
                    context.setVariable("formattedNgayBatDau", formattedNgayBatDau);
                    context.setVariable("formattedNgayKetThuc", formattedNgayKetThuc);
                    context.setVariable("action", action);

                    String htmlContent = templateEngine.process("email-dot-giam-gia", context);

                    MimeMessage message = mailSender.createMimeMessage();
                    MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

                    helper.setTo(toEmail);
                    helper.setSubject(subject);
                    helper.setText(htmlContent, true);

                    mailSender.send(message);
                }
                System.out.println("Successfully sent campaign emails to " + customers.size() + " customers (Action: " + action + ")");
            } catch (Exception e) {
                System.err.println("Failed to send campaign emails (Action: " + action + "): " + e.getMessage());
                e.printStackTrace();
            }
        });
    }

    /**
     * Chuyển mã trạng thái đơn hàng thành text hiển thị trong email.
     */
    private String getTrangThaiText(Integer trangThai) {
        if (trangThai == null) return "Chờ xác nhận";
        switch (trangThai) {
            case 0: return "Chờ xác nhận";
            case 1: return "Đã xác nhận";
            case 2: return "Đang xử lý";
            case 3: return "Đang giao hàng";
            case 4: return "Đã giao hàng";
            case 5: return "Giao hàng thất bại";
            case 6: return "Hoàn thành";
            case 7: return "Đã huỷ";
            case 8: return "Yêu cầu huỷ";
            case 9: return "Đã hoàn tiền";
            default: return "Chờ xác nhận";
        }
    }
}
