package com.example.be;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import org.junit.jupiter.api.Assertions;

@SpringBootTest
class BeApplicationTests {

    @Autowired
    private TemplateEngine templateEngine;

    @Test
    void contextLoads() {
    }

    @Test
    void testEmailTemplateRendering() {
        Context context = new Context();
        context.setVariable("customerName", "Nguyễn Văn A");
        context.setVariable("voucherCode", "TESTCODE123");
        context.setVariable("voucherName", "Mã Ưu Đãi Mùa Hè");
        context.setVariable("loaiGiamGia", "Phần trăm");
        context.setVariable("formattedGiaTriGiam", "15%");
        context.setVariable("formattedGiamToiDa", "100.000 VNĐ");
        context.setVariable("formattedDonToiThieu", "300.000 VNĐ");
        context.setVariable("formattedNgayBatDau", "10/06/2026");
        context.setVariable("formattedNgayKetThuc", "31/12/2026");
        context.setVariable("action", "CREATE");

        String htmlContent = templateEngine.process("email-voucher", context);
        Assertions.assertNotNull(htmlContent);
        Assertions.assertTrue(htmlContent.contains("Nguyễn Văn A"));
        Assertions.assertTrue(htmlContent.contains("TESTCODE123"));
        Assertions.assertTrue(htmlContent.contains("Mã Ưu Đãi Mùa Hè"));
        Assertions.assertTrue(htmlContent.contains("15%"));
        Assertions.assertTrue(htmlContent.contains("100.000 VNĐ"));
        System.out.println("Template rendered successfully!");
    }
}
