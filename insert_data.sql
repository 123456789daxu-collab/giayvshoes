USE VSHOES1;
GO

-- Insert Danh mục
INSERT INTO danh_muc (ma_danh_muc, ten_danh_muc, trang_thai) VALUES ('DM01', N'Giày Nam', 1), ('DM02', N'Giày Nữ', 1);

-- Insert Thương hiệu
INSERT INTO thuong_hieu (ma_thuong_hieu, ten_thuong_hieu, trang_thai) VALUES ('TH01', N'Nike', 1), ('TH02', N'Adidas', 1);

-- Insert Chất liệu
INSERT INTO chat_lieu (ma_chat_lieu, ten_chat_lieu, trang_thai) VALUES ('CL01', N'Da Bò', 1), ('CL02', N'Vải Canvas', 1);

-- Insert Loại giày
INSERT INTO loai_giay (ma_loai_giay, ten_loai_giay, trang_thai) VALUES ('LG01', N'Sneaker', 1), ('LG02', N'Giày Lười', 1);

-- Insert Màu sắc
INSERT INTO mau_sac (ma_mau_sac, ten_mau_sac, trang_thai) VALUES ('MS01', N'Đen', 1), ('MS02', N'Trắng', 1);

-- Insert Cỡ giày
INSERT INTO co_giay (ma_co_giay, size_giay, trang_thai) VALUES ('CG39', '39', 1), ('CG40', '40', 1);

-- Insert Sản phẩm
INSERT INTO san_pham (ma_san_pham, ten_san_pham, id_danh_muc, id_thuong_hieu, id_chat_lieu, id_loai_giay, gia_nhap, gia_ban, so_luong, trang_thai, mo_ta_chi_tiet)
VALUES 
('SP001', N'Giày Nike Air Force 1', 1, 1, 1, 1, 1500000, 2500000, 100, 1, N'Giày thể thao nam nữ chính hãng'),
('SP002', N'Giày Adidas Superstar', 1, 2, 1, 1, 1200000, 2000000, 50, 1, N'Giày thể thao cổ điển cực đẹp');

-- Insert Sản phẩm chi tiết
INSERT INTO san_pham_chi_tiet (ma, id_san_pham, id_mau_sac, id_co_giay, gia_nhap, gia_ban, so_luong_ton, trang_thai)
VALUES 
('SPCT001', 1, 1, 1, 1500000, 2500000, 50, 1),
('SPCT002', 1, 2, 2, 1500000, 2500000, 50, 1),
('SPCT003', 2, 1, 1, 1200000, 2000000, 25, 1),
('SPCT004', 2, 2, 2, 1200000, 2000000, 25, 1);
