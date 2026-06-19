package com.example.be.service.impl;

import com.example.be.entity.KhachHang;
import com.example.be.entity.PhieuGiamGia;
import com.example.be.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import java.util.concurrent.CompletableFuture;

@Service
public class EmailServiceImpl implements EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

<<<<<<< HEAD
    @Autowired
    private TemplateEngine templateEngine;

    @Override
    public void sendInvoiceEmail(com.example.be.dto.HoaDonDTO invoice,
            java.util.List<java.util.Map<String, Object>> items) {
        System.out.println("Sending invoice email for invoice " + (invoice != null ? invoice.getMaHoaDon() : "null"));
    }

    @Override
    public void sendVoucherNotification(KhachHang customer, PhieuGiamGia voucher) {
        sendHtmlEmail(
                customer.getEmail(),
                "[VShoes] Bạn nhận được mã giảm giá cá nhân mới!",
                "CREATE",
                customer,
                voucher);
    }

    @Override
    public void sendVoucherUpdateNotification(KhachHang customer, PhieuGiamGia voucher) {
        sendHtmlEmail(
                customer.getEmail(),
                "[VShoes] Mã giảm giá cá nhân của bạn đã được cập nhật!",
                "UPDATE",
                customer,
                voucher);
    }

    @Override
    public void sendVoucherCancelNotification(KhachHang customer, PhieuGiamGia voucher) {
        sendHtmlEmail(
                customer.getEmail(),
                "[VShoes] Mã giảm giá cá nhân của bạn đã tạm ngừng áp dụng!",
                "CANCEL",
                customer,
                voucher);
    }

    private void sendHtmlEmail(String toEmail, String subject, String action, KhachHang customer,
            PhieuGiamGia voucher) {
        if (toEmail == null || toEmail.trim().isEmpty()) {
=======
    @Override
    public void sendVoucherNotification(KhachHang customer, PhieuGiamGia voucher) {
        if (customer.getEmail() == null || customer.getEmail().trim().isEmpty()) {
>>>>>>> origin/feature-lehung
            return;
        }

        CompletableFuture.runAsync(() -> {
            try {
                if (mailSender == null) {
<<<<<<< HEAD
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
=======
                    System.out.println("JavaMailSender is not configured. Simulation email sent to " 
                        + customer.getEmail() + " for voucher " + voucher.getMaVoucher());
                    return;
                }
                
                SimpleMailMessage message = new SimpleMailMessage();
                message.setTo(customer.getEmail());
                message.setSubject("[VShoes] Bạn nhận được mã giảm giá cá nhân mới!");
                
                String valueText = "Tiền mặt".equalsIgnoreCase(voucher.getLoaiGiamGia()) 
                    ? String.format("%,.0f VNĐ", voucher.getGiaTriGiam().doubleValue())
                    : voucher.getGiaTriGiam() + "%";
                    
                String body = String.format(
                    "Xin chào %s,\n\n" +
                    "VShoes xin gửi tặng bạn mã giảm giá cá nhân mới:\n" +
                    "- Mã giảm giá: %s\n" +
                    "- Tên chương trình: %s\n" +
                    "- Giá trị ưu đãi: %s\n" +
                    "- Đơn hàng tối thiểu: %,.0f VNĐ\n" +
                    "- Thời hạn sử dụng: Từ %s đến %s\n\n" +
                    "Hãy nhanh tay truy cập VShoes để sử dụng ưu đãi này nhé!\n" +
                    "Trân trọng,\n" +
                    "Đội ngũ VShoes.",
                    customer.getHoTen(),
                    voucher.getMaVoucher(),
                    voucher.getTenVoucher(),
                    valueText,
                    voucher.getDonToiThieu().doubleValue(),
                    voucher.getNgayBatDau().toString().replace("T", " "),
                    voucher.getNgayKetThuc().toString().replace("T", " ")
                );
                
                message.setText(body);
                mailSender.send(message);
                System.out.println("Email successfully sent to " + customer.getEmail());
            } catch (Exception e) {
                System.err.println("Failed to send email to " + customer.getEmail() + ": " + e.getMessage());
            }
        });
    }

    @Override
    public void sendVoucherUpdateNotification(KhachHang customer, PhieuGiamGia voucher) {
        if (customer.getEmail() == null || customer.getEmail().trim().isEmpty()) {
            return;
        }

        CompletableFuture.runAsync(() -> {
            try {
                if (mailSender == null) {
                    System.out.println("JavaMailSender is not configured. Simulation UPDATE email sent to " 
                        + customer.getEmail() + " for voucher " + voucher.getMaVoucher());
                    return;
                }
                
                SimpleMailMessage message = new SimpleMailMessage();
                message.setTo(customer.getEmail());
                message.setSubject("[VShoes] Mã giảm giá cá nhân của bạn đã được cập nhật!");
                
                String valueText = "Tiền mặt".equalsIgnoreCase(voucher.getLoaiGiamGia()) 
                    ? String.format("%,.0f VNĐ", voucher.getGiaTriGiam().doubleValue())
                    : voucher.getGiaTriGiam() + "%";
                    
                String body = String.format(
                    "Xin chào %s,\n\n" +
                    "VShoes xin thông báo mã giảm giá cá nhân của bạn đã được cập nhật thông tin mới:\n" +
                    "- Mã giảm giá: %s\n" +
                    "- Tên chương trình: %s\n" +
                    "- Giá trị ưu đãi: %s\n" +
                    "- Đơn hàng tối thiểu: %,.0f VNĐ\n" +
                    "- Thời hạn sử dụng: Từ %s đến %s\n\n" +
                    "Hãy nhanh tay truy cập VShoes để kiểm tra và sử dụng ưu đãi nhé!\n" +
                    "Trân trọng,\n" +
                    "Đội ngũ VShoes.",
                    customer.getHoTen(),
                    voucher.getMaVoucher(),
                    voucher.getTenVoucher(),
                    valueText,
                    voucher.getDonToiThieu().doubleValue(),
                    voucher.getNgayBatDau().toString().replace("T", " "),
                    voucher.getNgayKetThuc().toString().replace("T", " ")
                );
                
                message.setText(body);
                mailSender.send(message);
                System.out.println("Update Email successfully sent to " + customer.getEmail());
            } catch (Exception e) {
                System.err.println("Failed to send update email to " + customer.getEmail() + ": " + e.getMessage());
            }
        });
    }

    @Override
    public void sendVoucherCancelNotification(KhachHang customer, PhieuGiamGia voucher) {
        if (customer.getEmail() == null || customer.getEmail().trim().isEmpty()) {
            return;
        }

        CompletableFuture.runAsync(() -> {
            try {
                if (mailSender == null) {
                    System.out.println("JavaMailSender is not configured. Simulation CANCEL email sent to " 
                        + customer.getEmail() + " for voucher " + voucher.getMaVoucher());
                    return;
                }
                
                SimpleMailMessage message = new SimpleMailMessage();
                message.setTo(customer.getEmail());
                message.setSubject("[VShoes] Mã giảm giá cá nhân của bạn đã tạm ngừng áp dụng!");
                
                String body = String.format(
                    "Xin chào %s,\n\n" +
                    "VShoes xin thông báo mã giảm giá cá nhân sau của bạn đã tạm ngừng áp dụng/ngừng hoạt động trong hệ thống:\n" +
                    "- Mã giảm giá: %s\n" +
                    "- Tên chương trình: %s\n\n" +
                    "Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ bộ phận hỗ trợ khách hàng của VShoes.\n" +
                    "Trân trọng,\n" +
                    "Đội ngũ VShoes.",
                    customer.getHoTen(),
                    voucher.getMaVoucher(),
                    voucher.getTenVoucher()
                );
                
                message.setText(body);
                mailSender.send(message);
                System.out.println("Cancel Email successfully sent to " + customer.getEmail());
            } catch (Exception e) {
                System.err.println("Failed to send cancel email to " + customer.getEmail() + ": " + e.getMessage());
            }
        });
    }

    @Override
    public void sendInvoiceEmail(com.example.be.dto.HoaDonDTO invoice, java.util.List<java.util.Map<String, Object>> items) {
        String recipientEmail = invoice.getEmail();
        if (recipientEmail == null || recipientEmail.trim().isEmpty() || "N/A".equalsIgnoreCase(recipientEmail.trim())) {
            recipientEmail = "lehung14042006@gmail.com";
        }

        final String targetEmail = recipientEmail;

        CompletableFuture.runAsync(() -> {
            try {
                if (mailSender == null) {
                    System.out.println("JavaMailSender is not configured. Simulation HTML email sent to " 
                        + targetEmail + " for invoice " + invoice.getMaHoaDon());
                    return;
                }

                jakarta.mail.internet.MimeMessage mimeMessage = mailSender.createMimeMessage();
                org.springframework.mail.javamail.MimeMessageHelper helper = new org.springframework.mail.javamail.MimeMessageHelper(mimeMessage, true, "UTF-8");
                
                helper.setTo(targetEmail);
                if (!"lehung14042006@gmail.com".equalsIgnoreCase(targetEmail)) {
                    helper.addCc("lehung14042006@gmail.com");
                }
                
                helper.setSubject("[VSHOES] Xác nhận đơn hàng " + (invoice.getMaHoaDon() != null ? invoice.getMaHoaDon() : ""));
                
                // Format Date
                String dateStr = "";
                if (invoice.getNgayTao() != null) {
                    java.time.format.DateTimeFormatter dtFormatter = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
                    dateStr = invoice.getNgayTao().format(dtFormatter);
                }

                String orderType = "Online".equalsIgnoreCase(invoice.getLoaiHoaDon()) ? "Trực tuyến" : "Tại quầy - giao hàng";
                
                // Get status text
                String statusName = "Chờ xác nhận";
                if (invoice.getTrangThai() != null) {
                    switch (invoice.getTrangThai()) {
                        case 0: statusName = "Chờ xác nhận"; break;
                        case 1: statusName = "Đã xác nhận"; break;
                        case 2: statusName = "Đang xử lý"; break;
                        case 3: statusName = "Đang giao"; break;
                        case 4: statusName = "Đã giao"; break;
                        case 5: statusName = "Giao hàng thất bại"; break;
                        case 6: statusName = "Hoàn thành"; break;
                        case 7: statusName = "Đã huỷ"; break;
                        case 8: statusName = "Yêu cầu huỷ"; break;
                        case 9: statusName = "Đã hoàn tiền"; break;
                    }
                }
                
                java.text.DecimalFormat formatter = new java.text.DecimalFormat("#,###");
                
                StringBuilder itemsRows = new StringBuilder();
                double subtotal = 0;
                for (java.util.Map<String, Object> item : items) {
                    String name = (String) item.getOrDefault("tenSanPham", "Sản phẩm");
                    String color = (String) item.getOrDefault("mauSac", "");
                    String size = (String) item.getOrDefault("coGiay", "");
                    String variant = "";
                    if (!color.isEmpty() || !size.isEmpty()) {
                        variant = " (" + color + (color.isEmpty() || size.isEmpty() ? "" : ", ") + size + ")";
                    }
                    
                    int qty = item.get("soLuong") != null ? ((Number) item.get("soLuong")).intValue() : 1;
                    double price = item.get("donGia") != null ? ((Number) item.get("donGia")).doubleValue() : 0;
                    double total = item.get("thanhTien") != null ? ((Number) item.get("thanhTien")).doubleValue() : (price * qty);
                    subtotal += total;
                    
                    itemsRows.append(String.format(
                        "<tr>" +
                        "  <td style='padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #334155;'>%s%s</td>" +
                        "  <td style='padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #334155; text-align: center; font-weight: bold;'>%d</td>" +
                        "  <td style='padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #334155; text-align: right;'>%s đ</td>" +
                        "  <td style='padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #ef4444; text-align: right; font-weight: bold;'>%s đ</td>" +
                        "</tr>",
                        name, variant, qty, formatter.format(price), formatter.format(total)
                    ));
                }
>>>>>>> origin/feature-lehung

                double discount = invoice.getTienGiam() != null ? invoice.getTienGiam().doubleValue() : 0;
                double ship = invoice.getPhiShip() != null ? invoice.getPhiShip().doubleValue() : 0;
                double grandTotal = invoice.getTongTien() != null ? invoice.getTongTien().doubleValue() : (subtotal + ship - discount);

                String htmlContent = 
                    "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);'>" +
                    "  <div style='background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); padding: 30px 20px; text-align: center; color: #ffffff;'>" +
                    "    <h1 style='margin: 0; font-size: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;'>Xác nhận đơn giao hàng</h1>" +
                    "    <p style='margin: 8px 0 0 0; font-size: 13px; opacity: 0.9;'>Cảm ơn bạn đã đặt hàng. Chúng tôi đã ghi nhận đơn và đang xử lý giao hàng.</p>" +
                    "  </div>" +
                    "  <div style='padding: 25px; background-color: #f8fafc;'>" +
                    "    <p style='font-size: 14px; color: #1e293b; margin-top: 0;'>Xin chào <strong>" + (invoice.getTenKhachHang() != null ? invoice.getTenKhachHang() : "Quyết") + "</strong>,</p>" +
                    "    <p style='font-size: 13px; color: #475569; line-height: 1.5;'>Đơn hàng <strong>#" + invoice.getMaHoaDon() + "</strong> của bạn đã được tạo thành công. Bên dưới là toàn bộ thông tin đặt hàng để bạn tiện theo dõi.</p>" +
                    "    " +
                    "    <div style='background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 25px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);'>" +
                    "      <h3 style='margin-top: 0; margin-bottom: 12px; font-size: 14px; color: #1e293b; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;'>Thông tin đơn hàng</h3>" +
                    "      <table style='width: 100%; font-size: 13px; border-collapse: collapse;'>" +
                    "        <tr><td style='padding: 5px 0; color: #64748b; width: 40%;'>Mã đơn hàng</td><td style='padding: 5px 0; color: #0f172a; font-weight: bold;'>" + invoice.getMaHoaDon() + "</td></tr>" +
                    "        <tr><td style='padding: 5px 0; color: #64748b;'>Thời gian đặt</td><td style='padding: 5px 0; color: #0f172a;'>" + dateStr + "</td></tr>" +
                    "        <tr><td style='padding: 5px 0; color: #64748b;'>Trạng thái</td><td style='padding: 5px 0; color: #2563eb; font-weight: bold;'>" + statusName + "</td></tr>" +
                    "        <tr><td style='padding: 5px 0; color: #64748b;'>Khách hàng</td><td style='padding: 5px 0; color: #0f172a;'>" + (invoice.getTenKhachHang() != null ? invoice.getTenKhachHang() : "-") + "</td></tr>" +
                    "        <tr><td style='padding: 5px 0; color: #64748b;'>SĐT khách hàng</td><td style='padding: 5px 0; color: #0f172a;'>" + (invoice.getSdtKhachHang() != null ? invoice.getSdtKhachHang() : "-") + "</td></tr>" +
                    "        <tr><td style='padding: 5px 0; color: #64748b;'>Người nhận</td><td style='padding: 5px 0; color: #0f172a;'>" + (invoice.getTenKhachHang() != null ? invoice.getTenKhachHang() : "-") + "</td></tr>" +
                    "        <tr><td style='padding: 5px 0; color: #64748b;'>SĐT người nhận</td><td style='padding: 5px 0; color: #0f172a;'>" + (invoice.getSdtKhachHang() != null ? invoice.getSdtKhachHang() : "-") + "</td></tr>" +
                    "        <tr><td style='padding: 5px 0; color: #64748b;'>Địa chỉ giao hàng</td><td style='padding: 5px 0; color: #0f172a;'>" + (invoice.getDiaChiGiao() != null ? invoice.getDiaChiGiao() : "-") + "</td></tr>" +
                    "        <tr><td style='padding: 5px 0; color: #64748b;'>Ghi chú</td><td style='padding: 5px 0; color: #0f172a; font-style: italic;'>" + (invoice.getGhiChu() != null ? invoice.getGhiChu() : "-") + "</td></tr>" +
                    "      </table>" +
                    "    </div>" +
                    "    " +
                    "    <h3 style='margin-top: 20px; margin-bottom: 10px; font-size: 14px; color: #1e293b;'>Chi tiết sản phẩm</h3>" +
                    "    <table style='width: 100%; border-collapse: collapse; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;'>" +
                    "      <thead>" +
                    "        <tr style='background-color: #f1f5f9;'>" +
                    "          <th style='padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; color: #475569;'>Sản phẩm</th>" +
                    "          <th style='padding: 10px; text-align: center; font-size: 11px; text-transform: uppercase; color: #475569; width: 60px;'>SL</th>" +
                    "          <th style='padding: 10px; text-align: right; font-size: 11px; text-transform: uppercase; color: #475569;'>Đơn giá</th>" +
                    "          <th style='padding: 10px; text-align: right; font-size: 11px; text-transform: uppercase; color: #475569;'>Thành tiền</th>" +
                    "        </tr>" +
                    "      </thead>" +
                    "      <tbody>" +
                    "        " + itemsRows.toString() +
                    "      </tbody>" +
                    "      <tfoot>" +
                    "        <tr style='background-color: #fafafa;'>" +
                    "          <td colspan='3' style='padding: 8px 10px; text-align: right; font-size: 12px; color: #64748b;'>Tổng tiền hàng:</td>" +
                    "          <td style='padding: 8px 10px; text-align: right; font-size: 12px; color: #0f172a; font-weight: bold;'>" + formatter.format(subtotal) + " đ</td>" +
                    "        </tr>" +
                    "        <tr style='background-color: #fafafa;'>" +
                    "          <td colspan='3' style='padding: 8px 10px; text-align: right; font-size: 12px; color: #64748b;'>Giảm giá:</td>" +
                    "          <td style='padding: 8px 10px; text-align: right; font-size: 12px; color: #16a34a; font-weight: bold;'>-" + formatter.format(discount) + " đ</td>" +
                    "        </tr>" +
                    "        <tr style='background-color: #fafafa;'>" +
                    "          <td colspan='3' style='padding: 8px 10px; text-align: right; font-size: 12px; color: #64748b;'>Phí vận chuyển:</td>" +
                    "          <td style='padding: 8px 10px; text-align: right; font-size: 12px; color: #0f172a; font-weight: bold;'>" + formatter.format(ship) + " đ</td>" +
                    "        </tr>" +
                    "        <tr style='background-color: #f1f5f9; font-weight: bold;'>" +
                    "          <td colspan='3' style='padding: 10px; text-align: right; font-size: 13px; color: #0f172a;'>TỔNG THANH TOÁN:</td>" +
                    "          <td style='padding: 10px; text-align: right; font-size: 14px; color: #ef4444;'>" + formatter.format(grandTotal) + " đ</td>" +
                    "        </tr>" +
                    "      </tfoot>" +
                    "    </table>" +
                    "  </div>" +
                    "  <div style='background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;'>" +
                    "    <p style='margin: 0;'>Đây là email tự động từ hệ thống cửa hàng VSHOES.</p>" +
                    "    <p style='margin: 4px 0 0 0;'>Mọi ý kiến đóng góp xin gửi về Hotline: 0868219136.</p>" +
                    "  </div>" +
                    "</div>";

                helper.setText(htmlContent, true);
                mailSender.send(mimeMessage);
                System.out.println("Invoice HTML email successfully sent to " + targetEmail);
            } catch (Exception e) {
<<<<<<< HEAD
                System.err.println(
                        "Failed to send HTML email to " + toEmail + " (Action: " + action + "): " + e.getMessage());
                e.printStackTrace();
=======
                System.err.println("Failed to send invoice HTML email to " + targetEmail + ": " + e.getMessage());
>>>>>>> origin/feature-lehung
            }
        });
    }
}

