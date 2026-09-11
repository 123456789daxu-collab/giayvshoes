package com.example.be.controller;

import jakarta.servlet.http.HttpServletRequest;

import com.example.be.entity.LoaiGiay;
import com.example.be.service.ThuocTinhService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/de-giay")
public class LoaiGiayController {

    @Autowired
    private ThuocTinhService thuocTinhService;

    @Autowired
    private com.example.be.service.MaGeneratorService maGeneratorService;

    @GetMapping
    public String index(Model model, 
                        @RequestParam(required = false) String keyword,
                        @RequestParam(required = false) Boolean trangThai,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "5") int size) {
        Pageable pageable = PageRequest.of(page, size, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "id"));
        Page<LoaiGiay> pageData = thuocTinhService.searchLoaiGiay(keyword, trangThai, pageable);
        model.addAttribute("pageData", pageData);
        model.addAttribute("keyword", keyword);
        model.addAttribute("trangThai", trangThai);
        model.addAttribute("nextMaLoaiGiay", maGeneratorService.generateMaLoaiGiay());
        return "de-giay";
    }

    @PostMapping("/add")
    public String add(@ModelAttribute LoaiGiay loaiGiay, RedirectAttributes redirectAttributes, HttpServletRequest request) {
        String referer = request.getHeader("Referer");
        try {
            thuocTinhService.addLoaiGiay(loaiGiay);
            redirectAttributes.addFlashAttribute("successMessage", "Thêm thành công");
        } catch (IllegalArgumentException | IllegalStateException e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Thêm thất bại! Tên hoặc mã có thể đã tồn tại.");
        }
        return "redirect:" + (referer != null ? referer : "/de-giay");
    }

    @PostMapping("/update/{id}")
    public String update(@PathVariable Long id, @ModelAttribute LoaiGiay loaiGiay, RedirectAttributes redirectAttributes, HttpServletRequest request) {
        String referer = request.getHeader("Referer");
        try {
            thuocTinhService.updateLoaiGiay(id, loaiGiay);
            redirectAttributes.addFlashAttribute("successMessage", "Cập nhật thành công");
        } catch (IllegalArgumentException | IllegalStateException e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Cập nhật thất bại! Tên hoặc mã có thể đã tồn tại.");
        }
        return "redirect:" + (referer != null ? referer : "/de-giay");
    }

    @GetMapping("/delete/{id}")
    public String delete(@PathVariable Long id, RedirectAttributes redirectAttributes, HttpServletRequest request) {
        try {
            thuocTinhService.toggleStatusLoaiGiay(id);
            redirectAttributes.addFlashAttribute("successMessage", "Cập nhật trạng thái thành công");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Lỗi khi cập nhật trạng thái!");
        }
        String referer = request.getHeader("Referer");
        return "redirect:" + (referer != null ? referer : "/de-giay");
    }
}
