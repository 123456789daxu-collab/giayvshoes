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
    public void sendInvoiceEmail(com.example.be.dto.HoaDonDTO invoice, java.util.List<java.util.Map<String, Object>> items) {
        System.out.println("Sending invoice email for invoice " + (invoice != null ? invoice.getMaHoaDon() : "null"));
    }

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
}
