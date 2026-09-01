package com.example.be.controller;

import jakarta.servlet.http.HttpServletRequest;

import com.example.be.entity.ThuongHieu;
import com.example.be.repository.ThuongHieuRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/thuong-hieu")
public class ThuongHieuController {

    @Autowired
    private ThuongHieuRepository thuongHieuRepository;

    @GetMapping
    public String index(Model model, 
                        @RequestParam(required = false) String keyword,
                        @RequestParam(required = false) Boolean trangThai,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "5") int size) {
        Pageable pageable = PageRequest.of(page, size, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "id"));
        Page<ThuongHieu> pageData;
        if ((keyword != null && !keyword.isEmpty()) || trangThai != null) {
            pageData = thuongHieuRepository.search(keyword, trangThai, pageable);
        } else {
            pageData = thuongHieuRepository.findAll(pageable);
        }
        model.addAttribute("pageData", pageData);
        model.addAttribute("keyword", keyword);
        model.addAttribute("trangThai", trangThai);
        return "thuong-hieu";
    }

    @PostMapping("/add")
    public String add(@ModelAttribute ThuongHieu thuongHieu, RedirectAttributes redirectAttributes, HttpServletRequest request) {
        String referer = request.getHeader("Referer");
        if (thuongHieu.getTenThuongHieu() == null || thuongHieu.getTenThuongHieu().trim().isEmpty()) {
            redirectAttributes.addFlashAttribute("errorMessage", "Tên thương hiệu không được để trống!");
            return "redirect:" + (referer != null ? referer : "/thuong-hieu");
        }
        String tenTrimmed = thuongHieu.getTenThuongHieu().trim();

        java.util.Optional<ThuongHieu> existing = thuongHieuRepository.findByTenThuongHieuIgnoreCase(tenTrimmed);
        if (existing.isPresent()) {
            redirectAttributes.addFlashAttribute("errorMessage", "Thêm thất bại! Thương hiệu này đã tồn tại trong hệ thống.");
            return "redirect:" + (referer != null ? referer : "/thuong-hieu");
        }

        thuongHieu.setTenThuongHieu(tenTrimmed);
        if (thuongHieu.getMaThuongHieu() == null || thuongHieu.getMaThuongHieu().trim().isEmpty() || "(Tự động sinh)".equals(thuongHieu.getMaThuongHieu().trim())) {
            thuongHieu.setMaThuongHieu("TH" + System.currentTimeMillis());
        }
        thuongHieu.setTrangThai(true);
        try {
            thuongHieuRepository.save(thuongHieu);
            redirectAttributes.addFlashAttribute("successMessage", "Thêm thành công");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Thêm thất bại! Tên hoặc mã thương hiệu có thể đã tồn tại.");
        }
        return "redirect:" + (referer != null ? referer : "/thuong-hieu");
    }

    @PostMapping("/update/{id}")
    public String update(@PathVariable Long id, @ModelAttribute ThuongHieu thuongHieu, RedirectAttributes redirectAttributes, HttpServletRequest request) {
        String referer = request.getHeader("Referer");
        if (thuongHieu.getTenThuongHieu() == null || thuongHieu.getTenThuongHieu().trim().isEmpty()) {
            redirectAttributes.addFlashAttribute("errorMessage", "Tên thương hiệu không được để trống!");
            return "redirect:" + (referer != null ? referer : "/thuong-hieu");
        }
        String tenTrimmed = thuongHieu.getTenThuongHieu().trim();

        java.util.Optional<ThuongHieu> existing = thuongHieuRepository.findByTenThuongHieuIgnoreCase(tenTrimmed);
        if (existing.isPresent() && !existing.get().getId().equals(id)) {
            redirectAttributes.addFlashAttribute("errorMessage", "Cập nhật thất bại! Tên thương hiệu đã trùng với thương hiệu khác.");
            return "redirect:" + (referer != null ? referer : "/thuong-hieu");
        }

        thuongHieu.setId(id);
        thuongHieu.setTenThuongHieu(tenTrimmed);
        try {
            thuongHieuRepository.save(thuongHieu);
            redirectAttributes.addFlashAttribute("successMessage", "Cập nhật thành công");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Cập nhật thất bại! Tên hoặc mã thương hiệu có thể đã tồn tại.");
        }
        return "redirect:" + (referer != null ? referer : "/thuong-hieu");
    }

    @GetMapping("/delete/{id}")
    public String delete(@PathVariable Long id, RedirectAttributes redirectAttributes, HttpServletRequest request) {
        try {
            ThuongHieu thuongHieu = thuongHieuRepository.findById(id).orElse(null);
            if (thuongHieu != null) {
                thuongHieu.setTrangThai(thuongHieu.getTrangThai() != null ? !thuongHieu.getTrangThai() : false);
                thuongHieuRepository.save(thuongHieu);
                redirectAttributes.addFlashAttribute("successMessage", "Cập nhật trạng thái thành công");
            }
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Lỗi khi cập nhật trạng thái!");
        }
        String referer = request.getHeader("Referer");
        return "redirect:" + (referer != null ? referer : "/thuong-hieu");
    }
}
