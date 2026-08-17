package com.example.be.service.impl;

import com.example.be.dto.ThongKeBieuDoDTO;
import com.example.be.dto.ThongKeTongQuanDTO;
import com.example.be.dto.ThongKeTrangThaiDTO;
import com.example.be.dto.TopSanPhamDTO;
import com.example.be.service.ThongKeService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class ThongKeServiceImpl implements ThongKeService {

    @PersistenceContext
    private EntityManager entityManager;

    private BigDecimal safeToBigDecimal(Object val) {
        if (val == null) return BigDecimal.ZERO;
        if (val instanceof BigDecimal) return (BigDecimal) val;
        if (val instanceof Double) return BigDecimal.valueOf((Double) val);
        if (val instanceof Integer) return BigDecimal.valueOf((Integer) val);
        if (val instanceof Long) return BigDecimal.valueOf((Long) val);
        try {
            return new BigDecimal(val.toString());
        } catch (Exception e) {
            return BigDecimal.ZERO;
        }
    }

    @Override
    public ThongKeTongQuanDTO getThongKeTongQuan(LocalDateTime startDate, LocalDateTime endDate) {
        ThongKeTongQuanDTO dto = new ThongKeTongQuanDTO();
        
        // 1. Tổng quan
        String whereBase = " WHERE 1=1 ";
        if (startDate != null) {
            whereBase += " AND ngay_tao >= :startDate ";
        }
        if (endDate != null) {
            whereBase += " AND ngay_tao <= :endDate ";
        }

        // Tổng số đơn
        String sqlTongDon = "SELECT COUNT(id) FROM hoa_don" + whereBase;
        Query qTongDon = entityManager.createNativeQuery(sqlTongDon);
        if (startDate != null) qTongDon.setParameter("startDate", startDate);
        if (endDate != null) qTongDon.setParameter("endDate", endDate);
        Number tongDon = (Number) qTongDon.getSingleResult();
        dto.setTongDonHang(tongDon != null ? tongDon.longValue() : 0L);
        
        // Doanh thu thực tế (chỉ đơn hàng đã hoàn thành, giả sử trạng thái hoàn thành là 5)
        String sqlDoanhThuThucTe = "SELECT SUM(tong_tien) FROM hoa_don" + whereBase + " AND trang_thai = 5";
        Query qDtt = entityManager.createNativeQuery(sqlDoanhThuThucTe);
        if (startDate != null) qDtt.setParameter("startDate", startDate);
        if (endDate != null) qDtt.setParameter("endDate", endDate);
        Object dtt = qDtt.getSingleResult();
        dto.setDoanhThuThucTe(safeToBigDecimal(dtt));
        
        // Doanh thu dự kiến (Tất cả đơn hàng)
        String sqlDoanhThuDuKien = "SELECT SUM(tong_tien) FROM hoa_don" + whereBase;
        Query qDtdk = entityManager.createNativeQuery(sqlDoanhThuDuKien);
        if (startDate != null) qDtdk.setParameter("startDate", startDate);
        if (endDate != null) qDtdk.setParameter("endDate", endDate);
        Object dtdk = qDtdk.getSingleResult();
        dto.setDoanhThuDuKien(safeToBigDecimal(dtdk));
        
        // Tổng doanh thu (Lấy doanh thu dự kiến cho thấy số)
        dto.setTongDoanhThu(dto.getDoanhThuDuKien());
        
        // 2. Thống kê theo các mốc thời gian
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfDay = now.toLocalDate().atStartOfDay();
        LocalDateTime startOfWeek = now.minusDays(now.getDayOfWeek().getValue() - 1).toLocalDate().atStartOfDay();
        LocalDateTime startOfMonth = now.withDayOfMonth(1).toLocalDate().atStartOfDay();
        LocalDateTime startOfYear = now.withDayOfYear(1).toLocalDate().atStartOfDay();
        
        // Hôm nay
        Object[] todayStats = getStatsForPeriod(startOfDay, now);
        dto.setDoanhThuHomNay(safeToBigDecimal(todayStats[0]));
        dto.setSoDonHomNay((Long) todayStats[1]);
        dto.setSoSanPhamHomNay((Long) todayStats[2]);
        
        // Tuần này
        Object[] weekStats = getStatsForPeriod(startOfWeek, now);
        dto.setDoanhThuTuanNay(safeToBigDecimal(weekStats[0]));
        dto.setSoDonTuanNay((Long) weekStats[1]);
        dto.setSoSanPhamTuanNay((Long) weekStats[2]);
        
        // Tháng này
        Object[] monthStats = getStatsForPeriod(startOfMonth, now);
        dto.setDoanhThuThangNay(safeToBigDecimal(monthStats[0]));
        dto.setSoDonThangNay((Long) monthStats[1]);
        dto.setSoSanPhamThangNay((Long) monthStats[2]);
        
        // Năm này
        Object[] yearStats = getStatsForPeriod(startOfYear, now);
        dto.setDoanhThuNamNay(safeToBigDecimal(yearStats[0]));
        dto.setSoDonNamNay((Long) yearStats[1]);
        dto.setSoSanPhamNamNay((Long) yearStats[2]);
        
        return dto;
    }
    
    private Object[] getStatsForPeriod(LocalDateTime start, LocalDateTime end) {
        String sql = "SELECT " +
                "  (SELECT SUM(tong_tien) FROM hoa_don WHERE ngay_tao >= :start AND ngay_tao <= :end) as doanhThu, " +
                "  (SELECT COUNT(id) FROM hoa_don WHERE ngay_tao >= :start AND ngay_tao <= :end) as soDon, " +
                "  (SELECT SUM(cthd.so_luong) FROM chi_tiet_hoa_don cthd JOIN hoa_don hd ON cthd.id_hoa_don = hd.id WHERE hd.ngay_tao >= :start AND hd.ngay_tao <= :end) as soSp";
        
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("start", start);
        query.setParameter("end", end);
        
        Object[] result = (Object[]) query.getSingleResult();
        
        BigDecimal dt = safeToBigDecimal(result[0]);
        Long sd = result[1] != null ? ((Number) result[1]).longValue() : 0L;
        Long ssp = result[2] != null ? ((Number) result[2]).longValue() : 0L;
        
        return new Object[]{dt, sd, ssp};
    }

    @Override
    public List<ThongKeBieuDoDTO> getBieuDoDoanhThu(LocalDateTime startDate, LocalDateTime endDate) {
        String sql = "SELECT CONVERT(varchar(10), ngay_tao, 120) as ngay, SUM(tong_tien) as doanhThu " +
                     "FROM hoa_don " +
                     "WHERE 1=1 ";
                     
        if (startDate != null) {
            sql += " AND ngay_tao >= :startDate ";
        }
        if (endDate != null) {
            sql += " AND ngay_tao <= :endDate ";
        }
        
        sql += " GROUP BY CONVERT(varchar(10), ngay_tao, 120) " +
               " ORDER BY CONVERT(varchar(10), ngay_tao, 120)";
               
        Query query = entityManager.createNativeQuery(sql);
        if (startDate != null) {
            query.setParameter("startDate", startDate);
        }
        if (endDate != null) {
            query.setParameter("endDate", endDate);
        }
        
        @SuppressWarnings("unchecked")
        List<Object[]> results = query.getResultList();
        List<ThongKeBieuDoDTO> dtoList = new ArrayList<>();
        
        for (Object[] row : results) {
            ThongKeBieuDoDTO dto = new ThongKeBieuDoDTO();
            dto.setNgay((String) row[0]);
            dto.setDoanhThu(safeToBigDecimal(row[1]));
            dtoList.add(dto);
        }
        
        return dtoList;
    }

    @Override
    public List<ThongKeTrangThaiDTO> getPhanBoTrangThai(LocalDateTime startDate, LocalDateTime endDate) {
        String sql = "SELECT trang_thai, COUNT(id) as soLuong " +
                     "FROM hoa_don " +
                     "WHERE 1=1 ";
                     
        if (startDate != null) {
            sql += " AND ngay_tao >= :startDate ";
        }
        if (endDate != null) {
            sql += " AND ngay_tao <= :endDate ";
        }
        
        sql += " GROUP BY trang_thai";
        
        Query query = entityManager.createNativeQuery(sql);
        if (startDate != null) {
            query.setParameter("startDate", startDate);
        }
        if (endDate != null) {
            query.setParameter("endDate", endDate);
        }
        
        @SuppressWarnings("unchecked")
        List<Object[]> results = query.getResultList();
        List<ThongKeTrangThaiDTO> dtoList = new ArrayList<>();
        
        for (Object[] row : results) {
            ThongKeTrangThaiDTO dto = new ThongKeTrangThaiDTO();
            dto.setTrangThai(row[0] != null ? ((Number) row[0]).intValue() : 0);
            dto.setSoLuong(row[1] != null ? ((Number) row[1]).longValue() : 0L);
            dtoList.add(dto);
        }
        
        return dtoList;
    }

    @Override
    public List<TopSanPhamDTO> getTopSanPhamBanChay(LocalDateTime startDate, LocalDateTime endDate,
                                                    Long idChatLieu, Long idThuongHieu, Long idLoaiGiay,
                                                    Long idCoGiay, Long idMauSac, Long idDanhMuc, Integer trangThai) {
        String sql = "SELECT " +
                     "  sp.ma_san_pham as ma, " +
                     "  sp.ten_san_pham as ten, " +
                     "  (ISNULL(ms.ten_mau_sac, '') + ' - ' + ISNULL(CAST(cg.size_giay AS VARCHAR), '')) as thuocTinh, " +
                     "  spct.gia_ban as gia, " +
                     "  spct.so_luong_ton as tonKho, " +
                     "  ISNULL(SUM(cthd.so_luong), 0) as daBan " +
                     "FROM san_pham_chi_tiet spct " +
                     "JOIN san_pham sp ON sp.id = spct.id_san_pham " +
                     "LEFT JOIN mau_sac ms ON ms.id = spct.id_mau_sac " +
                     "LEFT JOIN co_giay cg ON cg.id = spct.id_co_giay " +
                     "LEFT JOIN chi_tiet_hoa_don cthd ON spct.id = cthd.id_san_pham_chi_tiet " +
                     "LEFT JOIN hoa_don hd ON hd.id = cthd.id_hoa_don AND hd.trang_thai = 5 ";
                     
        if (startDate != null) {
            sql += " AND hd.ngay_tao >= :startDate ";
        }
        if (endDate != null) {
            sql += " AND hd.ngay_tao <= :endDate ";
        }
        
        sql += " WHERE 1=1 ";
        
        if (idChatLieu != null) sql += " AND sp.id_chat_lieu = :idChatLieu ";
        if (idThuongHieu != null) sql += " AND sp.id_thuong_hieu = :idThuongHieu ";
        if (idLoaiGiay != null) sql += " AND sp.id_loai_giay = :idLoaiGiay ";
        if (idDanhMuc != null) sql += " AND sp.id_danh_muc = :idDanhMuc ";
        if (idCoGiay != null) sql += " AND spct.id_co_giay = :idCoGiay ";
        if (idMauSac != null) sql += " AND spct.id_mau_sac = :idMauSac ";
        if (trangThai != null) sql += " AND sp.trang_thai = :trangThai ";
        
        sql += " GROUP BY sp.ma_san_pham, sp.ten_san_pham, ms.ten_mau_sac, cg.size_giay, spct.gia_ban, spct.so_luong_ton " +
               " ORDER BY daBan DESC";
               
        Query query = entityManager.createNativeQuery(sql);
        if (startDate != null) {
            query.setParameter("startDate", startDate);
        }
        if (endDate != null) {
            query.setParameter("endDate", endDate);
        }
        
        if (idChatLieu != null) query.setParameter("idChatLieu", idChatLieu);
        if (idThuongHieu != null) query.setParameter("idThuongHieu", idThuongHieu);
        if (idLoaiGiay != null) query.setParameter("idLoaiGiay", idLoaiGiay);
        if (idDanhMuc != null) query.setParameter("idDanhMuc", idDanhMuc);
        if (idCoGiay != null) query.setParameter("idCoGiay", idCoGiay);
        if (idMauSac != null) query.setParameter("idMauSac", idMauSac);
        if (trangThai != null) query.setParameter("trangThai", trangThai);
        
        @SuppressWarnings("unchecked")
        List<Object[]> results = query.getResultList();
        List<TopSanPhamDTO> dtoList = new ArrayList<>();
        
        for (Object[] row : results) {
            TopSanPhamDTO dto = new TopSanPhamDTO();
            dto.setMaSanPham((String) row[0]);
            dto.setTenSanPham((String) row[1]);
            dto.setThuocTinh((String) row[2]);
            dto.setDonGia(safeToBigDecimal(row[3]));
            dto.setTonKho(row[4] != null ? ((Number) row[4]).intValue() : 0);
            dto.setDaBan(row[5] != null ? ((Number) row[5]).longValue() : 0L);
            dtoList.add(dto);
        }
        
        return dtoList;
    }
}
