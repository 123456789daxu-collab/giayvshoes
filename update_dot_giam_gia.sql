USE VSHOES;
GO

-- 1. Thêm cột hinh_thuc_giam và gia_tri_giam
ALTER TABLE dot_giam_gia ADD hinh_thuc_giam NVARCHAR(50);
ALTER TABLE dot_giam_gia ADD gia_tri_giam DECIMAL(18,2);
GO

-- 2. Di chuyển dữ liệu cũ từ phan_tram_giam sang cấu trúc mới
UPDATE dot_giam_gia 
SET 
    gia_tri_giam = phan_tram_giam, 
    hinh_thuc_giam = '%' 
WHERE phan_tram_giam IS NOT NULL AND hinh_thuc_giam IS NULL;
GO
