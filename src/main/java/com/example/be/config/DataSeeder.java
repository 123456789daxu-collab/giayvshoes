package com.example.be.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public DataSeeder(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) throws Exception {
        // Thuong Hieu
        Integer countTH = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM thuong_hieu", Integer.class);
        if (countTH == null || countTH == 0) {
            jdbcTemplate.execute("INSERT INTO thuong_hieu(ma_thuong_hieu, ten_thuong_hieu, trang_thai) VALUES ('TH01', 'Nike', 1), ('TH02', 'Adidas', 1), ('TH03', 'Puma', 1)");
        }
        
        // Chat Lieu
        Integer countCL = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM chat_lieu", Integer.class);
        if (countCL == null || countCL == 0) {
            jdbcTemplate.execute("INSERT INTO chat_lieu(ma_chat_lieu, ten_chat_lieu, trang_thai) VALUES ('CL01', N'Da thật', 1), ('CL02', N'Vải Canvas', 1)");
        }

        // Mau Sac
        Integer countMS = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM mau_sac", Integer.class);
        if (countMS == null || countMS == 0) {
            jdbcTemplate.execute("INSERT INTO mau_sac(ma_mau_sac, ten_mau_sac, trang_thai) VALUES ('MS01', N'Đen', 1), ('MS02', N'Trắng', 1), ('MS03', N'Đỏ', 1)");
        }

        // Loai Giay
        Integer countLG = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM loai_giay", Integer.class);
        if (countLG == null || countLG == 0) {
            jdbcTemplate.execute("INSERT INTO loai_giay(ma_loai_giay, ten_loai_giay, trang_thai) VALUES ('LG01', N'Giày thể thao', 1), ('LG02', N'Giày lười', 1)");
        }

        // Danh Muc
        Integer countDM = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM danh_muc", Integer.class);
        if (countDM == null || countDM == 0) {
            jdbcTemplate.execute("INSERT INTO danh_muc(ma_danh_muc, ten_danh_muc, trang_thai) VALUES ('DM01', N'Nam', 1), ('DM02', N'Nữ', 1)");
        }

        // Co Giay
        Integer countCG = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM co_giay", Integer.class);
        if (countCG == null || countCG == 0) {
            jdbcTemplate.execute("INSERT INTO co_giay(ma_co_giay, size_giay, trang_thai) VALUES ('CG01', '39', 1), ('CG02', '40', 1), ('CG03', '41', 1)");
        }

        // Sync tổng số lượng tồn của bảng san_pham
        try {
            jdbcTemplate.execute("UPDATE sp SET sp.so_luong = (SELECT COALESCE(SUM(ct.so_luong_ton), 0) FROM san_pham_chi_tiet ct WHERE ct.id_san_pham = sp.id) FROM san_pham sp");
        } catch (Exception e) {
            System.err.println("Failed to sync product stock quantities on startup: " + e.getMessage());
        }
    }
}
