package com.example.be.controller;

import jakarta.servlet.http.HttpServletRequest;

import com.example.be.entity.DanhMuc;
import com.example.be.repository.DanhMucRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/the-loai")
public class DanhMucController {

    @Autowired
    private DanhMucRepository danhMucRepository;

    @GetMapping
    public String index(Model model, 
                        @RequestParam(required = false) String keyword,
                        @RequestParam(required = false) Boolean trangThai,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "5") int size) {
        Pageable pageable = PageRequest.of(page, size, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "id"));
        Page<DanhMuc> pageData;
        if ((keyword != null && !keyword.isEmpty()) || trangThai != null) {
            pageData = danhMucRepository.search(keyword, trangThai, pageable);
        } else {
            pageData = danhMucRepository.findAll(pageable);
        }
        model.addAttribute("pageData", pageData);
        model.addAttribute("keyword", keyword);
        model.addAttribute("trangThai", trangThai);
        return "the-loai";
    }

    @PostMapping("/add")
    public String add(@ModelAttribute DanhMuc danhMuc, RedirectAttributes redirectAttributes, HttpServletRequest request) {
        if (danhMuc.getMaDanhMuc() == null || danhMuc.getMaDanhMuc().trim().isEmpty()) {
            danhMuc.setMaDanhMuc("DM" + System.currentTimeMillis());
        }
        danhMucRepository.save(danhMuc);
        redirectAttributes.addFlashAttribute("successMessage", "Thêm thành công");
        String referer = request.getHeader("Referer");
        return "redirect:" + (referer != null ? referer : "/the-loai");
    }

    @PostMapping("/update/{id}")
    public String update(@PathVariable Long id, @ModelAttribute DanhMuc danhMuc, RedirectAttributes redirectAttributes, HttpServletRequest request) {
        danhMuc.setId(id);
        danhMucRepository.save(danhMuc);
        redirectAttributes.addFlashAttribute("successMessage", "Cập nhật thành công");
        String referer = request.getHeader("Referer");
        return "redirect:" + (referer != null ? referer : "/the-loai");
    }

    @GetMapping("/delete/{id}")
    public String delete(@PathVariable Long id, RedirectAttributes redirectAttributes, HttpServletRequest request) {
        try {
            danhMucRepository.deleteById(id);
            redirectAttributes.addFlashAttribute("successMessage", "Xóa thành công");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Không thể xóa vì dữ liệu đang được sử dụng ở sản phẩm khác!");
        }
        String referer = request.getHeader("Referer");
        return "redirect:" + (referer != null ? referer : "/the-loai");
    }
}
