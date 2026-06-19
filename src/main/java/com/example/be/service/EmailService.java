package com.example.be.service;

import com.example.be.entity.KhachHang;
import com.example.be.entity.PhieuGiamGia;

public interface EmailService {
    void sendVoucherNotification(KhachHang customer, PhieuGiamGia voucher);
    void sendVoucherUpdateNotification(KhachHang customer, PhieuGiamGia voucher);
    void sendVoucherCancelNotification(KhachHang customer, PhieuGiamGia voucher);
}
