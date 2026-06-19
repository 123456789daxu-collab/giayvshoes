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

    @Override
    public void sendVoucherNotification(KhachHang customer, PhieuGiamGia voucher) {
        if (customer.getEmail() == null || customer.getEmail().trim().isEmpty()) {
            return;
        }

        CompletableFuture.runAsync(() -> {
            try {
                if (mailSender == null) {
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
}
