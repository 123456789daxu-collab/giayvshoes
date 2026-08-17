package com.example.be.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseRepair implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public DatabaseRepair(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) throws Exception {
        System.out.println("--- STARTING DATABASE REPAIR ---");
        String[] alterStatements = {
            "ALTER TABLE mau_sac ALTER COLUMN ten_mau_sac nvarchar(255)",
            "ALTER TABLE chat_lieu ALTER COLUMN ten_chat_lieu nvarchar(255)",
            "ALTER TABLE loai_giay ALTER COLUMN ten_loai_giay nvarchar(255)",
            "ALTER TABLE danh_muc ALTER COLUMN ten_danh_muc nvarchar(255)",
            "ALTER TABLE thuong_hieu ALTER COLUMN ten_thuong_hieu nvarchar(255)",
            "ALTER TABLE co_giay ALTER COLUMN size_giay nvarchar(255)",
            "ALTER TABLE khach_hang ALTER COLUMN ho_ten nvarchar(255)",
            "ALTER TABLE dia_chi ALTER COLUMN ten_nguoi_nhan nvarchar(255)",
            "ALTER TABLE dia_chi ALTER COLUMN dia_chi_chi_tiet nvarchar(500)",
            "ALTER TABLE dia_chi ALTER COLUMN tinh_thanh nvarchar(255)",
            "ALTER TABLE dia_chi ALTER COLUMN quan_huyen nvarchar(255)",
            "ALTER TABLE dia_chi ALTER COLUMN phuong_xa nvarchar(255)",
            "ALTER TABLE dia_chi ALTER COLUMN loai_dia_chi nvarchar(255)",
            "ALTER TABLE hoa_don ALTER COLUMN ten_nguoi_nhan nvarchar(255)",
            "ALTER TABLE hoa_don ALTER COLUMN dia_chi_nhan nvarchar(500)",
            "ALTER TABLE hoa_don ALTER COLUMN ghi_chu nvarchar(max)",
            "ALTER TABLE san_pham ALTER COLUMN ten_san_pham nvarchar(255)",
            "ALTER TABLE san_pham ALTER COLUMN mo_ta_chi_tiet nvarchar(max)",
            "ALTER TABLE phieu_giam_gia ALTER COLUMN ten_voucher nvarchar(255)",
            "ALTER TABLE dot_giam_gia ALTER COLUMN ten_dot_giam_gia nvarchar(255)",
            "ALTER TABLE dot_giam_gia ALTER COLUMN mo_ta nvarchar(max)",
            "ALTER TABLE lich_su_hoa_don ALTER COLUMN hanh_dong nvarchar(255)",
            "ALTER TABLE lich_su_hoa_don ALTER COLUMN ghi_chu nvarchar(max)",
            "ALTER TABLE lich_su_thanh_toan ALTER COLUMN phuong_thuc_thanh_toan nvarchar(255)",
            "ALTER TABLE lich_su_thanh_toan ALTER COLUMN ghi_chu nvarchar(max)",
            "ALTER TABLE nhan_vien ALTER COLUMN ho_ten nvarchar(255)",
            "ALTER TABLE nhan_vien ALTER COLUMN dia_chi nvarchar(500)",
            "ALTER TABLE nhan_vien ALTER COLUMN chuc_vu nvarchar(255)"
        };

        for (String sql : alterStatements) {
            try {
                jdbcTemplate.execute(sql);
            } catch (Exception e) {
                // Ignore if already altered or constraint exists
            }
        }
        System.out.println("Altered tables columns to nvarchar successfully.");

        try {
            // 2. Update values to standard Unicode Vietnamese using unicode escape sequences
            jdbcTemplate.update("UPDATE mau_sac SET ten_mau_sac = N'Tr\u1eafng' WHERE id = 1");
            jdbcTemplate.update("UPDATE mau_sac SET ten_mau_sac = N'\u0110en' WHERE id = 2");
            jdbcTemplate.update("UPDATE mau_sac SET ten_mau_sac = N'\u0110\u1ecf' WHERE id = 3");

            jdbcTemplate.update("UPDATE chat_lieu SET ten_chat_lieu = N'Da b\u00f2' WHERE id = 1");
            jdbcTemplate.update("UPDATE chat_lieu SET ten_chat_lieu = N'V\u1ea3i Canvas' WHERE id = 2");
            jdbcTemplate.update("UPDATE chat_lieu SET ten_chat_lieu = N'Cao su non' WHERE id = 3");

            jdbcTemplate.update("UPDATE loai_giay SET ten_loai_giay = N'Sneaker' WHERE id = 1");
            jdbcTemplate.update("UPDATE loai_giay SET ten_loai_giay = N'Gi\u00e0y Ch\u1ea1y B\u1ed9' WHERE id = 2");
            jdbcTemplate.update("UPDATE loai_giay SET ten_loai_giay = N'Gi\u00e0y L\u01b0\u1eddi' WHERE id = 3");

            jdbcTemplate.update("UPDATE danh_muc SET ten_danh_muc = N'Gi\u00e0y Nam' WHERE id = 1");
            jdbcTemplate.update("UPDATE danh_muc SET ten_danh_muc = N'Gi\u00e0y N\u1eef' WHERE id = 2");
            jdbcTemplate.update("UPDATE danh_muc SET ten_danh_muc = N'Unisex' WHERE id = 3");

            // Fix corrupted Vietnamese text in hoa_don table address strings
            jdbcTemplate.update("UPDATE hoa_don SET dia_chi_nhan = REPLACE(dia_chi_nhan, 'TRU?NG TI?U H?C', N'TRƯỜNG TIỂU HỌC') WHERE dia_chi_nhan LIKE '%TRU?NG%'");
            jdbcTemplate.update("UPDATE hoa_don SET dia_chi_nhan = REPLACE(dia_chi_nhan, 'Phu?ng', N'Phường') WHERE dia_chi_nhan LIKE '%Phu?ng%'");
            jdbcTemplate.update("UPDATE hoa_don SET dia_chi_nhan = REPLACE(dia_chi_nhan, 'Qu?n', N'Quận') WHERE dia_chi_nhan LIKE '%Qu?n%'");
            jdbcTemplate.update("UPDATE hoa_don SET dia_chi_nhan = REPLACE(dia_chi_nhan, 'Thành ph?', N'Thành phố') WHERE dia_chi_nhan LIKE '%Thành ph?%'");
            jdbcTemplate.update("UPDATE hoa_don SET dia_chi_nhan = REPLACE(dia_chi_nhan, 'Hà N?i', N'Hà Nội') WHERE dia_chi_nhan LIKE '%Hà N?i%'");
            jdbcTemplate.update("UPDATE hoa_don SET dia_chi_nhan = REPLACE(dia_chi_nhan, 'TAM Đ?O', N'TAM ĐẢO') WHERE dia_chi_nhan LIKE '%TAM Đ?O%'");
            jdbcTemplate.update("UPDATE hoa_don SET dia_chi_nhan = REPLACE(dia_chi_nhan, 'VINH PHÚC', N'VĨNH PHÚC') WHERE dia_chi_nhan LIKE '%VINH PHÚC%'");
            jdbcTemplate.update("UPDATE hoa_don SET dia_chi_nhan = REPLACE(dia_chi_nhan, 'Cao B?ng', N'Cao Bằng') WHERE dia_chi_nhan LIKE '%Cao B?ng%'");
            jdbcTemplate.update("UPDATE hoa_don SET dia_chi_nhan = REPLACE(dia_chi_nhan, 'B?ng', N'Bằng') WHERE dia_chi_nhan LIKE '%B?ng%'");
            jdbcTemplate.update("UPDATE hoa_don SET dia_chi_nhan = REPLACE(dia_chi_nhan, 'T?nh', N'Tỉnh') WHERE dia_chi_nhan LIKE '%T?nh%'");
            jdbcTemplate.update("UPDATE hoa_don SET dia_chi_nhan = REPLACE(dia_chi_nhan, 'Hi?n', N'Hiến') WHERE dia_chi_nhan LIKE '%Hi?n%'");
            jdbcTemplate.update("UPDATE hoa_don SET dia_chi_nhan = REPLACE(dia_chi_nhan, 'Qu?ng', N'Quảng') WHERE dia_chi_nhan LIKE '%Qu?ng%'");
            jdbcTemplate.update("UPDATE hoa_don SET dia_chi_nhan = REPLACE(dia_chi_nhan, 'B?nh', N'Bình') WHERE dia_chi_nhan LIKE '%B?nh%'");
            jdbcTemplate.update("UPDATE hoa_don SET dia_chi_nhan = REPLACE(dia_chi_nhan, 'H?i', N'Hải') WHERE dia_chi_nhan LIKE '%H?i%'");
            jdbcTemplate.update("UPDATE hoa_don SET dia_chi_nhan = REPLACE(dia_chi_nhan, 'Đ?ng', N'Đồng') WHERE dia_chi_nhan LIKE '%Đ?ng%'");

            // Fix corrupted text in dia_chi table
            jdbcTemplate.update("UPDATE dia_chi SET dia_chi_chi_tiet = REPLACE(dia_chi_chi_tiet, 'TRU?NG TI?U H?C', N'TRƯỜNG TIỂU HỌC') WHERE dia_chi_chi_tiet LIKE '%TRU?NG%'");
            jdbcTemplate.update("UPDATE dia_chi SET dia_chi_chi_tiet = REPLACE(dia_chi_chi_tiet, 'TAM Đ?O', N'TAM ĐẢO') WHERE dia_chi_chi_tiet LIKE '%TAM Đ?O%'");
            jdbcTemplate.update("UPDATE dia_chi SET dia_chi_chi_tiet = REPLACE(dia_chi_chi_tiet, 'VINH PHÚC', N'VĨNH PHÚC') WHERE dia_chi_chi_tiet LIKE '%VINH PHÚC%'");
            jdbcTemplate.update("UPDATE dia_chi SET dia_chi_chi_tiet = REPLACE(dia_chi_chi_tiet, 'Phu?ng', N'Phường') WHERE dia_chi_chi_tiet LIKE '%Phu?ng%'");
            jdbcTemplate.update("UPDATE dia_chi SET dia_chi_chi_tiet = REPLACE(dia_chi_chi_tiet, 'Qu?n', N'Quận') WHERE dia_chi_chi_tiet LIKE '%Qu?n%'");
            jdbcTemplate.update("UPDATE dia_chi SET dia_chi_chi_tiet = REPLACE(dia_chi_chi_tiet, 'Thành ph?', N'Thành phố') WHERE dia_chi_chi_tiet LIKE '%Thành ph?%'");
            jdbcTemplate.update("UPDATE dia_chi SET dia_chi_chi_tiet = REPLACE(dia_chi_chi_tiet, 'Hà N?i', N'Hà Nội') WHERE dia_chi_chi_tiet LIKE '%Hà N?i%'");
            jdbcTemplate.update("UPDATE khach_hang SET email = CONCAT('khach_', id, '@vshoes.com') WHERE email = 'lehung14042006@gmail.com' OR email LIKE '%hung8197128904%'");
            jdbcTemplate.update("UPDATE khach_hang SET email = 'lehung14042006@gmail.com' WHERE so_dien_thoai = '0787417354'");





            System.out.println("Database records successfully updated and corrected.");
        } catch (Exception e) {
            System.out.println("Updating database records error: " + e.getMessage());
        }
        System.out.println("--- DATABASE REPAIR COMPLETE ---");
    }

}
