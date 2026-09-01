package com.example.be.controller;

import jakarta.servlet.http.HttpServletRequest;

import com.example.be.entity.MauSac;
import com.example.be.repository.MauSacRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/mau-sac")
public class MauSacController {

    @Autowired
    private MauSacRepository mauSacRepository;

    @GetMapping
    public String index(Model model, 
                        @RequestParam(required = false) String keyword,
                        @RequestParam(required = false) Boolean trangThai,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "5") int size) {
        Pageable pageable = PageRequest.of(page, size, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "id"));
        Page<MauSac> pageData;
        if ((keyword != null && !keyword.isEmpty()) || trangThai != null) {
            pageData = mauSacRepository.search(keyword, trangThai, pageable);
        } else {
            pageData = mauSacRepository.findAll(pageable);
        }
        model.addAttribute("pageData", pageData);
        model.addAttribute("keyword", keyword);
        model.addAttribute("trangThai", trangThai);
        return "mau-sac";
    }

    @PostMapping("/add")
    public String add(@ModelAttribute MauSac mauSac, RedirectAttributes redirectAttributes, HttpServletRequest request) {
        String referer = request.getHeader("Referer");
        if (mauSac.getTenMauSac() == null || mauSac.getTenMauSac().trim().isEmpty()) {
            redirectAttributes.addFlashAttribute("errorMessage", "Tên màu sắc không được để trống!");
            return "redirect:" + (referer != null ? referer : "/mau-sac");
        }
        String tenTrimmed = mauSac.getTenMauSac().trim();

        java.util.Optional<MauSac> existing = mauSacRepository.findByTenMauSacIgnoreCase(tenTrimmed);
        if (existing.isPresent()) {
            redirectAttributes.addFlashAttribute("errorMessage", "Thêm thất bại! Màu sắc này đã tồn tại trong hệ thống.");
            return "redirect:" + (referer != null ? referer : "/mau-sac");
        }

        mauSac.setTenMauSac(tenTrimmed);
        if (mauSac.getMaMauSac() == null || mauSac.getMaMauSac().trim().isEmpty() || "(Tự động sinh)".equals(mauSac.getMaMauSac().trim())) {
            mauSac.setMaMauSac("MS" + System.currentTimeMillis());
        }
        mauSac.setTrangThai(true);
        try {
            mauSacRepository.save(mauSac);
            redirectAttributes.addFlashAttribute("successMessage", "Thêm thành công");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Thêm thất bại! Tên hoặc mã có thể đã tồn tại.");
        }
        return "redirect:" + (referer != null ? referer : "/mau-sac");
    }

    @PostMapping("/update/{id}")
    public String update(@PathVariable Long id, @ModelAttribute MauSac mauSac, RedirectAttributes redirectAttributes, HttpServletRequest request) {
        String referer = request.getHeader("Referer");
        if (mauSac.getTenMauSac() == null || mauSac.getTenMauSac().trim().isEmpty()) {
            redirectAttributes.addFlashAttribute("errorMessage", "Tên màu sắc không được để trống!");
            return "redirect:" + (referer != null ? referer : "/mau-sac");
        }
        String tenTrimmed = mauSac.getTenMauSac().trim();

        java.util.Optional<MauSac> existing = mauSacRepository.findByTenMauSacIgnoreCase(tenTrimmed);
        if (existing.isPresent() && !existing.get().getId().equals(id)) {
            redirectAttributes.addFlashAttribute("errorMessage", "Cập nhật thất bại! Tên màu sắc đã trùng với màu sắc khác.");
            return "redirect:" + (referer != null ? referer : "/mau-sac");
        }

        mauSac.setId(id);
        mauSac.setTenMauSac(tenTrimmed);
        try {
            mauSacRepository.save(mauSac);
            redirectAttributes.addFlashAttribute("successMessage", "Cập nhật thành công");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Cập nhật thất bại! Tên hoặc mã có thể đã tồn tại.");
        }
        return "redirect:" + (referer != null ? referer : "/mau-sac");
    }

    @GetMapping("/delete/{id}")
    public String delete(@PathVariable Long id, RedirectAttributes redirectAttributes, HttpServletRequest request) {
        try {
            MauSac mauSac = mauSacRepository.findById(id).orElse(null);
            if(mauSac != null) {
                mauSac.setTrangThai(mauSac.getTrangThai() != null ? !mauSac.getTrangThai() : false);
                mauSacRepository.save(mauSac);
                redirectAttributes.addFlashAttribute("successMessage", "Cập nhật trạng thái thành công");
            }
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Đã có lỗi xảy ra!");
        }
        String referer = request.getHeader("Referer");
        return "redirect:" + (referer != null ? referer : "/mau-sac");
    }
}
