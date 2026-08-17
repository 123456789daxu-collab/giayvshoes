-- Script tạo bảng danh_gia (SQL Server) với hỗ trợ ảnh đánh giá
-- Chạy script này trên database VHOES để kích hoạt tính năng đánh giá sản phẩm

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='danh_gia' AND xtype='U')
BEGIN
    CREATE TABLE danh_gia (
        id            BIGINT IDENTITY(1,1) PRIMARY KEY,
        id_hoa_don    BIGINT        NULL,
        id_san_pham   BIGINT        NULL,
        id_khach_hang BIGINT        NULL,
        so_sao        INT           NOT NULL CHECK (so_sao BETWEEN 1 AND 5),
        noi_dung      NVARCHAR(MAX) NULL,
        anh_danh_gia  NVARCHAR(MAX) NULL,   -- JSON array URL ảnh, tối đa 5 ảnh
        ten_hien_thi  NVARCHAR(255) NULL,
        ngay_tao      DATETIME      NULL DEFAULT GETDATE(),
        trang_thai    INT           NULL DEFAULT 1,

        CONSTRAINT FK_DanhGia_HoaDon    FOREIGN KEY (id_hoa_don)    REFERENCES hoa_don(id),
        CONSTRAINT FK_DanhGia_SanPham   FOREIGN KEY (id_san_pham)   REFERENCES san_pham(id),
        CONSTRAINT FK_DanhGia_KhachHang FOREIGN KEY (id_khach_hang) REFERENCES khach_hang(id)
    );

    -- Unique index: mỗi đơn hàng chỉ được đánh giá 1 lần
    CREATE UNIQUE INDEX UQ_DanhGia_HoaDon ON danh_gia(id_hoa_don)
    WHERE id_hoa_don IS NOT NULL;

    CREATE INDEX IX_DanhGia_SanPham ON danh_gia(id_san_pham);

    PRINT 'Bảng danh_gia đã được tạo thành công!';
END
ELSE
BEGIN
    -- Nếu bảng đã tồn tại nhưng chưa có cột anh_danh_gia thì thêm vào
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_NAME = 'danh_gia' AND COLUMN_NAME = 'anh_danh_gia')
    BEGIN
        ALTER TABLE danh_gia ADD anh_danh_gia NVARCHAR(MAX) NULL;
        PRINT 'Đã thêm cột anh_danh_gia vào bảng danh_gia.';
    END
    ELSE
        PRINT 'Bảng danh_gia đã tồn tại và đầy đủ cột, bỏ qua.';
END
