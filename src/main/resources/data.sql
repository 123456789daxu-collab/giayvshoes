-- =========================================================================
-- VSHOES INITIAL SEED DATA FOR SQL SERVER
-- Tự động chạy khi khởi động ứng dụng (Spring Boot DataSource Initializer)
-- =========================================================================

-- 1. DANH MỤC
IF NOT EXISTS (SELECT 1 FROM danh_muc WHERE ma_danh_muc = 'DM01')
    INSERT INTO danh_muc (ma_danh_muc, ten_danh_muc, trang_thai) VALUES ('DM01', N'Giày Nam', 1);
IF NOT EXISTS (SELECT 1 FROM danh_muc WHERE ma_danh_muc = 'DM02')
    INSERT INTO danh_muc (ma_danh_muc, ten_danh_muc, trang_thai) VALUES ('DM02', N'Giày Nữ', 1);
IF NOT EXISTS (SELECT 1 FROM danh_muc WHERE ma_danh_muc = 'DM03')
    INSERT INTO danh_muc (ma_danh_muc, ten_danh_muc, trang_thai) VALUES ('DM03', N'Giày Thể Thao', 1);
IF NOT EXISTS (SELECT 1 FROM danh_muc WHERE ma_danh_muc = 'DM04')
    INSERT INTO danh_muc (ma_danh_muc, ten_danh_muc, trang_thai) VALUES ('DM04', N'Giày Thời Trang', 1);

-- 2. THƯƠNG HIỆU
IF NOT EXISTS (SELECT 1 FROM thuong_hieu WHERE ma_thuong_hieu = 'TH01')
    INSERT INTO thuong_hieu (ma_thuong_hieu, ten_thuong_hieu, trang_thai) VALUES ('TH01', N'Nike', 1);
IF NOT EXISTS (SELECT 1 FROM thuong_hieu WHERE ma_thuong_hieu = 'TH02')
    INSERT INTO thuong_hieu (ma_thuong_hieu, ten_thuong_hieu, trang_thai) VALUES ('TH02', N'Adidas', 1);
IF NOT EXISTS (SELECT 1 FROM thuong_hieu WHERE ma_thuong_hieu = 'TH03')
    INSERT INTO thuong_hieu (ma_thuong_hieu, ten_thuong_hieu, trang_thai) VALUES ('TH03', N'Puma', 1);
IF NOT EXISTS (SELECT 1 FROM thuong_hieu WHERE ma_thuong_hieu = 'TH04')
    INSERT INTO thuong_hieu (ma_thuong_hieu, ten_thuong_hieu, trang_thai) VALUES ('TH04', N'Converse', 1);
IF NOT EXISTS (SELECT 1 FROM thuong_hieu WHERE ma_thuong_hieu = 'TH05')
    INSERT INTO thuong_hieu (ma_thuong_hieu, ten_thuong_hieu, trang_thai) VALUES ('TH05', N'Vans', 1);

-- 3. CHẤT LIỆU
IF NOT EXISTS (SELECT 1 FROM chat_lieu WHERE ma_chat_lieu = 'CL01')
    INSERT INTO chat_lieu (ma_chat_lieu, ten_chat_lieu, trang_thai) VALUES ('CL01', N'Da Bò', 1);
IF NOT EXISTS (SELECT 1 FROM chat_lieu WHERE ma_chat_lieu = 'CL02')
    INSERT INTO chat_lieu (ma_chat_lieu, ten_chat_lieu, trang_thai) VALUES ('CL02', N'Vải Canvas', 1);
IF NOT EXISTS (SELECT 1 FROM chat_lieu WHERE ma_chat_lieu = 'CL03')
    INSERT INTO chat_lieu (ma_chat_lieu, ten_chat_lieu, trang_thai) VALUES ('CL03', N'Da PU', 1);
IF NOT EXISTS (SELECT 1 FROM chat_lieu WHERE ma_chat_lieu = 'CL04')
    INSERT INTO chat_lieu (ma_chat_lieu, ten_chat_lieu, trang_thai) VALUES ('CL04', N'Vải Lưới Thoáng Khí', 1);

-- 4. LOẠI GIÀY
IF NOT EXISTS (SELECT 1 FROM loai_giay WHERE ma_loai_giay = 'LG01')
    INSERT INTO loai_giay (ma_loai_giay, ten_loai_giay, trang_thai) VALUES ('LG01', N'Sneaker', 1);
IF NOT EXISTS (SELECT 1 FROM loai_giay WHERE ma_loai_giay = 'LG02')
    INSERT INTO loai_giay (ma_loai_giay, ten_loai_giay, trang_thai) VALUES ('LG02', N'Giày Lười', 1);
IF NOT EXISTS (SELECT 1 FROM loai_giay WHERE ma_loai_giay = 'LG03')
    INSERT INTO loai_giay (ma_loai_giay, ten_loai_giay, trang_thai) VALUES ('LG03', N'Giày Cổ Cao', 1);
IF NOT EXISTS (SELECT 1 FROM loai_giay WHERE ma_loai_giay = 'LG04')
    INSERT INTO loai_giay (ma_loai_giay, ten_loai_giay, trang_thai) VALUES ('LG04', N'Giày Chạy Bộ', 1);

-- 5. MÀU SẮC
IF NOT EXISTS (SELECT 1 FROM mau_sac WHERE ma_mau_sac = 'MS01')
    INSERT INTO mau_sac (ma_mau_sac, ten_mau_sac, trang_thai) VALUES ('MS01', N'Đen', 1);
IF NOT EXISTS (SELECT 1 FROM mau_sac WHERE ma_mau_sac = 'MS02')
    INSERT INTO mau_sac (ma_mau_sac, ten_mau_sac, trang_thai) VALUES ('MS02', N'Trắng', 1);
IF NOT EXISTS (SELECT 1 FROM mau_sac WHERE ma_mau_sac = 'MS03')
    INSERT INTO mau_sac (ma_mau_sac, ten_mau_sac, trang_thai) VALUES ('MS03', N'Xám', 1);
IF NOT EXISTS (SELECT 1 FROM mau_sac WHERE ma_mau_sac = 'MS04')
    INSERT INTO mau_sac (ma_mau_sac, ten_mau_sac, trang_thai) VALUES ('MS04', N'Xanh Navy', 1);
IF NOT EXISTS (SELECT 1 FROM mau_sac WHERE ma_mau_sac = 'MS05')
    INSERT INTO mau_sac (ma_mau_sac, ten_mau_sac, trang_thai) VALUES ('MS05', N'Đỏ', 1);

-- 6. CỠ GIÀY (KÍCH THƯỚC)
IF NOT EXISTS (SELECT 1 FROM co_giay WHERE ma_co_giay = 'CG38')
    INSERT INTO co_giay (ma_co_giay, size_giay, trang_thai) VALUES ('CG38', 38, 1);
IF NOT EXISTS (SELECT 1 FROM co_giay WHERE ma_co_giay = 'CG39')
    INSERT INTO co_giay (ma_co_giay, size_giay, trang_thai) VALUES ('CG39', 39, 1);
IF NOT EXISTS (SELECT 1 FROM co_giay WHERE ma_co_giay = 'CG40')
    INSERT INTO co_giay (ma_co_giay, size_giay, trang_thai) VALUES ('CG40', 40, 1);
IF NOT EXISTS (SELECT 1 FROM co_giay WHERE ma_co_giay = 'CG41')
    INSERT INTO co_giay (ma_co_giay, size_giay, trang_thai) VALUES ('CG41', 41, 1);
IF NOT EXISTS (SELECT 1 FROM co_giay WHERE ma_co_giay = 'CG42')
    INSERT INTO co_giay (ma_co_giay, size_giay, trang_thai) VALUES ('CG42', 42, 1);
IF NOT EXISTS (SELECT 1 FROM co_giay WHERE ma_co_giay = 'CG43')
    INSERT INTO co_giay (ma_co_giay, size_giay, trang_thai) VALUES ('CG43', 43, 1);

-- 7. SẢN PHẨM MẪU
IF NOT EXISTS (SELECT 1 FROM san_pham WHERE ma_san_pham = 'SP001')
    INSERT INTO san_pham (ma_san_pham, ten_san_pham, id_danh_muc, id_thuong_hieu, id_chat_lieu, id_loai_giay, gia_nhap, gia_ban, so_luong, trang_thai, mo_ta_chi_tiet, ngay_tao)
    VALUES ('SP001', N'Giày Nike Air Force 1 07', 1, 1, 1, 1, 1500000, 2500000, 100, 1, N'Giày thể thao cao cấp Nike Air Force 1, chất liệu da thật êm ái, phong cách cổ điển thanh lịch.', GETDATE());

IF NOT EXISTS (SELECT 1 FROM san_pham WHERE ma_san_pham = 'SP002')
    INSERT INTO san_pham (ma_san_pham, ten_san_pham, id_danh_muc, id_thuong_hieu, id_chat_lieu, id_loai_giay, gia_nhap, gia_ban, so_luong, trang_thai, mo_ta_chi_tiet, ngay_tao)
    VALUES ('SP002', N'Giày Adidas Superstar Original', 1, 2, 1, 1, 1200000, 2000000, 80, 1, N'Mẫu giày kinh điển với mũi sò cao su đặc trưng và 3 sọc thể thao.', GETDATE());

-- 8. SẢN PHẨM CHI TIẾT (BIẾN THỂ)
IF NOT EXISTS (SELECT 1 FROM san_pham_chi_tiet WHERE ma = 'SPCT001')
    INSERT INTO san_pham_chi_tiet (ma, id_san_pham, id_mau_sac, id_co_giay, gia_nhap, gia_ban, so_luong_ton, trang_thai, trang_luong)
    VALUES ('SPCT001', 1, 1, 2, 1500000, 2500000, 50, 1, 0.8);

IF NOT EXISTS (SELECT 1 FROM san_pham_chi_tiet WHERE ma = 'SPCT002')
    INSERT INTO san_pham_chi_tiet (ma, id_san_pham, id_mau_sac, id_co_giay, gia_nhap, gia_ban, so_luong_ton, trang_thai, trang_luong)
    VALUES ('SPCT002', 1, 2, 3, 1500000, 2500000, 50, 1, 0.8);

IF NOT EXISTS (SELECT 1 FROM san_pham_chi_tiet WHERE ma = 'SPCT003')
    INSERT INTO san_pham_chi_tiet (ma, id_san_pham, id_mau_sac, id_co_giay, gia_nhap, gia_ban, so_luong_ton, trang_thai, trang_luong)
    VALUES ('SPCT003', 2, 1, 2, 1200000, 2000000, 40, 1, 0.8);

IF NOT EXISTS (SELECT 1 FROM san_pham_chi_tiet WHERE ma = 'SPCT004')
    INSERT INTO san_pham_chi_tiet (ma, id_san_pham, id_mau_sac, id_co_giay, gia_nhap, gia_ban, so_luong_ton, trang_thai, trang_luong)
    VALUES ('SPCT004', 2, 2, 3, 1200000, 2000000, 40, 1, 0.8);
