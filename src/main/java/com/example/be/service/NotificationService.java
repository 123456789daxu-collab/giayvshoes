package com.example.be.service;

import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.javamail.MimeMessageHelper;
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
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setTo(toEmail);
            helper.setSubject("Tài khoản hệ thống VShoes của bạn");
            
            String htmlMsg = "<!DOCTYPE html>\n" +
                    "<html>\n" +
                    "<head>\n" +
                    "    <meta charset=\"UTF-8\">\n" +
                    "</head>\n" +
                    "<body style=\"font-family: Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 20px;\">\n" +
                    "    <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background-color: #f4f7f6; padding: 20px;\">\n" +
                    "        <tr>\n" +
                    "            <td align=\"center\">\n" +
                    "                <table width=\"700\" cellpadding=\"0\" cellspacing=\"0\" style=\"background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);\">\n" +
                    "                    <tr>\n" +
                    "                        <!-- Left Panel -->\n" +
                    "                        <td width=\"40%\" style=\"background-color: #10b981; color: white; padding: 40px 30px; vertical-align: top;\">\n" +
                    "                            <div style=\"font-size: 14px; font-weight: bold; border: 1px solid rgba(255,255,255,0.5); display: inline-block; padding: 4px 12px; border-radius: 20px; margin-bottom: 30px;\">VSHOES</div>\n" +
                    "                            <div style=\"font-size: 32px; font-weight: bold; margin-bottom: 15px; line-height: 1.2;\">VShoes<br>Internal</div>\n" +
                    "                            <div style=\"font-size: 15px; opacity: 0.9; line-height: 1.5; margin-bottom: 40px;\">Hệ thống quản lý nội bộ chuyên nghiệp và hiệu quả</div>\n" +
                    "                            \n" +
                    "                            <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-top: 30px; color: white;\">\n" +
                    "                                <tr>\n" +
                    "                                    <td width=\"33%\" align=\"center\">\n" +
                    "                                        <div style=\"font-size: 24px; margin-bottom: 5px;\">🛡️</div>\n" +
                    "                                        <div style=\"font-size: 13px; font-weight: bold;\">Bảo mật</div>\n" +
                    "                                        <div style=\"font-size: 11px; opacity: 0.8;\">An toàn thông tin</div>\n" +
                    "                                    </td>\n" +
                    "                                    <td width=\"33%\" align=\"center\">\n" +
                    "                                        <div style=\"font-size: 24px; margin-bottom: 5px;\">⚡</div>\n" +
                    "                                        <div style=\"font-size: 13px; font-weight: bold;\">Hiệu quả</div>\n" +
                    "                                        <div style=\"font-size: 11px; opacity: 0.8;\">Tối ưu quy trình</div>\n" +
                    "                                    </td>\n" +
                    "                                    <td width=\"33%\" align=\"center\">\n" +
                    "                                        <div style=\"font-size: 24px; margin-bottom: 5px;\">🤝</div>\n" +
                    "                                        <div style=\"font-size: 13px; font-weight: bold;\">Kết nối</div>\n" +
                    "                                        <div style=\"font-size: 11px; opacity: 0.8;\">Làm việc cùng nhau</div>\n" +
                    "                                    </td>\n" +
                    "                                </tr>\n" +
                    "                            </table>\n" +
                    "                        </td>\n" +
                    "                        \n" +
                    "                        <!-- Right Panel -->\n" +
                    "                        <td width=\"60%\" style=\"padding: 40px 30px; background-color: #ffffff; vertical-align: top;\">\n" +
                    "                            <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">\n" +
                    "                                <tr>\n" +
                    "                                    <td width=\"50\" valign=\"middle\">\n" +
                    "                                        <div style=\"width: 40px; height: 40px; border-radius: 50%; background-color: #ecfdf5; color: #10b981; text-align: center; line-height: 40px; font-size: 20px; font-weight: bold;\">👤</div>\n" +
                    "                                    </td>\n" +
                    "                                    <td valign=\"middle\">\n" +
                    "                                        <div style=\"font-size: 16px; color: #555;\">Xin chào,</div>\n" +
                    "                                        <div style=\"font-size: 22px; font-weight: bold; color: #10b981;\">" + fullName + " 👋</div>\n" +
                    "                                    </td>\n" +
                    "                                </tr>\n" +
                    "                            </table>\n" +
                    "                            \n" +
                    "                            <p style=\"color: #555; line-height: 1.6; margin: 25px 0; font-size: 15px;\">\n" +
                    "                                Tài khoản truy cập hệ thống của bạn đã được tạo.<br>\n" +
                    "                                Vui lòng sử dụng thông tin dưới đây để đăng nhập.\n" +
                    "                            </p>\n" +
                    "                            \n" +
                    "                            <div style=\"background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px 20px; margin-bottom: 10px;\">\n" +
                    "                                <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">\n" +
                    "                                    <tr>\n" +
                    "                                        <td style=\"color: #10b981; font-weight: bold; font-size: 12px; text-transform: uppercase;\">👤 USERNAME</td>\n" +
                    "                                        <td align=\"right\" style=\"font-weight: bold; color: #333; font-size: 15px;\">" + toEmail + "</td>\n" +
                    "                                    </tr>\n" +
                    "                                </table>\n" +
                    "                            </div>\n" +
                    "                            \n" +
                    "                            <div style=\"background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px 20px; margin-bottom: 25px;\">\n" +
                    "                                <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">\n" +
                    "                                    <tr>\n" +
                    "                                        <td style=\"color: #10b981; font-weight: bold; font-size: 12px; text-transform: uppercase;\">🔒 MẬT KHẨU TẠM THỜI</td>\n" +
                    "                                        <td align=\"right\" style=\"font-weight: bold; color: #333; font-size: 15px;\">" + password + "</td>\n" +
                    "                                    </tr>\n" +
                    "                                </table>\n" +
                    "                            </div>\n" +
                    "                            \n" +
                    "                            <a href=\"http://localhost:8080/dang-nhap\" style=\"display: block; background-color: #10b981; color: white; text-decoration: none; padding: 14px 20px; border-radius: 6px; font-weight: bold; text-align: center; margin-bottom: 25px; font-size: 16px;\">\n" +
                    "                                ➜ Đăng nhập hệ thống\n" +
                    "                            </a>\n" +
                    "                            \n" +
                    "                            <div style=\"background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 15px; font-size: 13px; color: #92400e;\">\n" +
                    "                                ⚠️ Bạn cần đổi mật khẩu ngay sau lần đăng nhập đầu tiên để đảm bảo bảo mật.\n" +
                    "                            </div>\n" +
                    "                        </td>\n" +
                    "                    </tr>\n" +
                    "                </table>\n" +
                    "            </td>\n" +
                    "        </tr>\n" +
                    "    </table>\n" +
                    "</body>\n" +
                    "</html>";
            
            helper.setText(htmlMsg, true); // true indicates HTML
            
            mailSender.send(message);
            System.out.println("[INFO] HTML Email sent successfully to: " + toEmail);
        } catch (Exception e) {
            System.out.println("[ERROR] Failed to send email to " + toEmail + ". Reason: " + e.getMessage());
            e.printStackTrace();
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
