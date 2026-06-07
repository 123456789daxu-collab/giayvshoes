package com.example.be.controller;

import com.example.be.entity.SanPham;
import com.example.be.repository.LoaiGiayRepository;
import com.example.be.repository.ThuongHieuRepository;
import com.example.be.service.SanPhamService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import org.springframework.data.domain.Page;
import java.util.List;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;

@Controller
@RequestMapping("/san-pham")
public class SanPhamController {

    @Autowired
    private SanPhamService sanPhamService;

    @Autowired
    private ThuongHieuRepository thuongHieuRepository;

    @Autowired
    private LoaiGiayRepository loaiGiayRepository;

    @GetMapping
    public String index(Model model, 
                        @RequestParam(defaultValue = "1") int page,
                        @RequestParam(required = false) String keyword,
                        @RequestParam(required = false) Long idThuongHieu,
                        @RequestParam(required = false) Long idLoaiGiay,
                        @RequestParam(required = false) Integer trangThai,
                        @RequestParam(required = false) String sort) {
        int pageSize = 5;
        Page<SanPham> pageSanPham = sanPhamService.searchFilter(keyword, idThuongHieu, idLoaiGiay, trangThai, sort, page, pageSize);
        
        // Cần lấy tất cả để đếm số lượng thống kê chuẩn
        List<SanPham> allProducts = sanPhamService.getAll();
        long totalProducts = allProducts.size();
        long activeProducts = allProducts.stream().filter(sp -> sp.getTrangThai() != null && sp.getTrangThai() == 1).count();
        long inactiveProducts = allProducts.stream().filter(sp -> sp.getTrangThai() == null || sp.getTrangThai() == 0).count();

        model.addAttribute("listSanPham", pageSanPham.getContent());
        model.addAttribute("currentPage", page);
        model.addAttribute("totalPages", pageSanPham.getTotalPages());
        model.addAttribute("totalItems", pageSanPham.getTotalElements());
        model.addAttribute("keyword", keyword);
        model.addAttribute("idThuongHieu", idThuongHieu);
        model.addAttribute("idLoaiGiay", idLoaiGiay);
        model.addAttribute("trangThai", trangThai);
        model.addAttribute("sort", sort);
        
        model.addAttribute("totalProducts", totalProducts);
        model.addAttribute("activeProducts", activeProducts);
        model.addAttribute("inactiveProducts", inactiveProducts);
        
        model.addAttribute("listThuongHieu", thuongHieuRepository.findAll());
        model.addAttribute("listLoaiGiay", loaiGiayRepository.findAll());
        return "san-pham";
    }

    @PostMapping("/add")
    public String add(@ModelAttribute SanPham sanPham, RedirectAttributes redirectAttributes, HttpServletRequest request) {
        try {
            sanPhamService.save(sanPham);
            redirectAttributes.addFlashAttribute("successMessage", "Thêm sản phẩm thành công!");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Lỗi khi thêm sản phẩm: " + e.getMessage());
        }
        String referer = request.getHeader("Referer");
        return "redirect:" + (referer != null ? referer : "/san-pham");
    }

    @PostMapping("/edit/{id}")
    public String edit(@PathVariable Long id, @ModelAttribute SanPham sanPham, RedirectAttributes redirectAttributes, HttpServletRequest request) {
        try {
            sanPhamService.update(id, sanPham);
            redirectAttributes.addFlashAttribute("successMessage", "Cập nhật sản phẩm thành công!");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Lỗi khi cập nhật sản phẩm: " + e.getMessage());
        }
        String referer = request.getHeader("Referer");
        return "redirect:" + (referer != null ? referer : "/san-pham");
    }

    @GetMapping("/delete/{id}")
    public String delete(@PathVariable Long id, RedirectAttributes redirectAttributes, HttpServletRequest request) {
        try {
            sanPhamService.delete(id);
            redirectAttributes.addFlashAttribute("successMessage", "Xóa sản phẩm thành công!");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Không thể xóa sản phẩm này. Có thể sản phẩm đang có chi tiết hoặc hóa đơn liên quan.");
        }
        String referer = request.getHeader("Referer");
        return "redirect:" + (referer != null ? referer : "/san-pham");
    }

    @GetMapping("/toggle-status/{id}")
    public String toggleStatus(@PathVariable Long id, RedirectAttributes redirectAttributes, HttpServletRequest request) {
        try {
            sanPhamService.toggleStatus(id);
            redirectAttributes.addFlashAttribute("successMessage", "Đổi trạng thái thành công!");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Lỗi khi đổi trạng thái!");
        }
        String referer = request.getHeader("Referer");
        return "redirect:" + (referer != null ? referer : "/san-pham");
    }

    @GetMapping("/export/excel")
    public void exportExcel(HttpServletResponse response,
                            @RequestParam(defaultValue = "1") int page,
                            @RequestParam(required = false) String keyword,
                            @RequestParam(required = false) Long idThuongHieu,
                            @RequestParam(required = false) Long idLoaiGiay,
                            @RequestParam(required = false) Integer trangThai,
                            @RequestParam(required = false) String sort) throws IOException {
        response.setContentType("application/octet-stream");
        String headerKey = "Content-Disposition";
        String headerValue = "attachment; filename=san_pham_" + System.currentTimeMillis() + ".xlsx";
        response.setHeader(headerKey, headerValue);

        int pageSize = 5;
        Page<SanPham> pageSanPham = sanPhamService.searchFilter(keyword, idThuongHieu, idLoaiGiay, trangThai, sort, page, pageSize);
        List<SanPham> listSanPham = pageSanPham.getContent();

        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Sản Phẩm");

        Row headerRow = sheet.createRow(0);
        headerRow.createCell(0).setCellValue("STT");
        headerRow.createCell(1).setCellValue("Mã SP");
        headerRow.createCell(2).setCellValue("Tên Sản Phẩm");
        headerRow.createCell(3).setCellValue("Thương Hiệu");
        headerRow.createCell(4).setCellValue("Loại Giày");
        headerRow.createCell(5).setCellValue("Trạng Thái");

        int rowCount = 1;
        for (SanPham sp : listSanPham) {
            Row row = sheet.createRow(rowCount++);
            row.createCell(0).setCellValue(rowCount - 1);
            row.createCell(1).setCellValue(sp.getMaSanPham() != null ? sp.getMaSanPham() : "");
            row.createCell(2).setCellValue(sp.getTenSanPham() != null ? sp.getTenSanPham() : "");
            row.createCell(3).setCellValue(sp.getThuongHieu() != null ? sp.getThuongHieu().getTenThuongHieu() : "");
            row.createCell(4).setCellValue(sp.getLoaiGiay() != null ? sp.getLoaiGiay().getTenLoaiGiay() : "");
            row.createCell(5).setCellValue(sp.getTrangThai() != null && sp.getTrangThai() == 1 ? "Kinh doanh" : "Ngừng kinh doanh");
        }

        workbook.write(response.getOutputStream());
        workbook.close();
    }
}
