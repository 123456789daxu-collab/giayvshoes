package com.example.be.service;

import com.example.be.entity.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ThuocTinhService {

    // Danh mục
    Page<DanhMuc> searchDanhMuc(String keyword, Boolean trangThai, Pageable pageable);
    DanhMuc addDanhMuc(DanhMuc dm);
    DanhMuc updateDanhMuc(Long id, DanhMuc dm);
    void toggleStatusDanhMuc(Long id);
    DanhMuc addQuickDanhMuc(String ten);
    List<DanhMuc> getAllDanhMuc();

    // Loại giày
    Page<LoaiGiay> searchLoaiGiay(String keyword, Boolean trangThai, Pageable pageable);
    LoaiGiay addLoaiGiay(LoaiGiay lg);
    LoaiGiay updateLoaiGiay(Long id, LoaiGiay lg);
    void toggleStatusLoaiGiay(Long id);
    LoaiGiay addQuickLoaiGiay(String ten);
    List<LoaiGiay> getAllLoaiGiay();

    // Thương hiệu
    Page<ThuongHieu> searchThuongHieu(String keyword, Boolean trangThai, Pageable pageable);
    ThuongHieu addThuongHieu(ThuongHieu th);
    ThuongHieu updateThuongHieu(Long id, ThuongHieu th);
    void toggleStatusThuongHieu(Long id);
    ThuongHieu addQuickThuongHieu(String ten);
    List<ThuongHieu> getAllThuongHieu();

    // Chất liệu
    Page<ChatLieu> searchChatLieu(String keyword, Boolean trangThai, Pageable pageable);
    ChatLieu addChatLieu(ChatLieu cl);
    ChatLieu updateChatLieu(Long id, ChatLieu cl);
    void toggleStatusChatLieu(Long id);
    ChatLieu addQuickChatLieu(String ten);
    List<ChatLieu> getAllChatLieu();

    // Màu sắc
    Page<MauSac> searchMauSac(String keyword, Boolean trangThai, Pageable pageable);
    MauSac addMauSac(MauSac ms);
    MauSac updateMauSac(Long id, MauSac ms);
    void toggleStatusMauSac(Long id);
    MauSac addQuickMauSac(String ten);
    List<MauSac> getAllMauSac();

    // Kích thước / Cổ giày
    Page<CoGiay> searchCoGiay(String keyword, Boolean trangThai, Pageable pageable);
    CoGiay addCoGiay(CoGiay cg);
    CoGiay updateCoGiay(Long id, CoGiay cg);
    void toggleStatusCoGiay(Long id);
    CoGiay addQuickCoGiay(String ten);
    List<CoGiay> getAllCoGiay();
}
