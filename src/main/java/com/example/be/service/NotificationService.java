package com.example.be.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;

@Service
public class NotificationService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    /**
     * Send email notification to employee
     */
    public void sendEmailNotification(String toEmail, String fullName, String password) {
        if (mailSender == null) {
            System.out.println("[WARNING] JavaMailSender is not configured. Email to " + toEmail + " is skipped.");
            return;
        }
        
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(toEmail);
            message.setSubject("Thông tin tài khoản nhân viên VShoes");
            message.setText("Xin chào " + fullName + ",\n\n" +
                            "Chào mừng bạn gia nhập hệ thống cửa hàng VShoes.\n" +
                            "Dưới đây là thông tin đăng nhập của bạn:\n" +
                            "- Email đăng nhập: " + toEmail + "\n" +
                            "- Mật khẩu tạm thời: " + password + "\n\n" +
                            "Vui lòng đổi mật khẩu sau khi đăng nhập lần đầu tiên để đảm bảo bảo mật.\n\n" +
                            "Trân trọng,\nBan Quản lý VShoes");
            
            mailSender.send(message);
            System.out.println("[INFO] Email sent successfully to: " + toEmail);
        } catch (Exception e) {
            System.out.println("[ERROR] Failed to send email to " + toEmail + ". Reason: " + e.getMessage());
        }
    }

    /**
     * Send SMS notification to employee (Mock Implementation)
     */
    public void sendSmsNotification(String phoneNumber, String fullName) {
        if (phoneNumber == null || phoneNumber.isEmpty()) return;
        
        String message = "VShoes: Chao mung " + fullName + " gia nhap. Tai khoan cua ban da duoc tao thanh cong. Vui long kiem tra Email de lay mat khau.";
        
        // Mocking the SMS send by printing to console
        System.out.println("=================================================");
        System.out.println("[MOCK SMS SERVICE - GỬI TIN NHẮN SMS GIẢ LẬP]");
        System.out.println("Tới SĐT: " + phoneNumber);
        System.out.println("Nội dung: " + message);
        System.out.println("Trạng thái: Gửi thành công!");
        System.out.println("=================================================");
    }
}
