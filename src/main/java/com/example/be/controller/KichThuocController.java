package com.example.be.controller;

import jakarta.servlet.http.HttpServletRequest;

import com.example.be.entity.CoGiay;
import com.example.be.repository.CoGiayRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/kich-thuoc")
public class KichThuocController {

    @Autowired
    private CoGiayRepository coGiayRepository;

    @GetMapping
    public String index(Model model, 
                        @RequestParam(required = false) String keyword,
                        @RequestParam(required = false) Boolean trangThai,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "5") int size) {
        Pageable pageable = PageRequest.of(page, size, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "id"));
        Page<CoGiay> pageData;
        if ((keyword != null && !keyword.isEmpty()) || trangThai != null) {
            pageData = coGiayRepository.search(keyword, trangThai, pageable);
        } else {
            pageData = coGiayRepository.findAll(pageable);
        }
        model.addAttribute("pageData", pageData);
        model.addAttribute("keyword", keyword);
        model.addAttribute("trangThai", trangThai);
        return "kich-thuoc";
    }

    @PostMapping("/add")
    public String add(@ModelAttribute CoGiay coGiay, RedirectAttributes redirectAttributes, HttpServletRequest request) {
        String referer = request.getHeader("Referer");
        if (coGiay.getSizeGiay() == null || coGiay.getSizeGiay() <= 0) {
            redirectAttributes.addFlashAttribute("errorMessage", "Kích thước không hợp lệ!");
            return "redirect:" + (referer != null ? referer : "/kich-thuoc");
        }
        try {
            coGiayRepository.save(coGiay);
            redirectAttributes.addFlashAttribute("successMessage", "Thêm thành công");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Thêm thất bại! Mã kích thước có thể đã tồn tại.");
        }
        return "redirect:" + (referer != null ? referer : "/kich-thuoc");
    }

    @PostMapping("/update/{id}")
    public String update(@PathVariable Long id, @ModelAttribute CoGiay coGiay, RedirectAttributes redirectAttributes, HttpServletRequest request) {
        String referer = request.getHeader("Referer");
        if (coGiay.getSizeGiay() == null || coGiay.getSizeGiay() <= 0) {
            redirectAttributes.addFlashAttribute("errorMessage", "Kích thước không hợp lệ!");
            return "redirect:" + (referer != null ? referer : "/kich-thuoc");
        }
        coGiay.setId(id);
        try {
            coGiayRepository.save(coGiay);
            redirectAttributes.addFlashAttribute("successMessage", "Cập nhật thành công");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Cập nhật thất bại! Mã kích thước có thể đã tồn tại.");
        }
        return "redirect:" + (referer != null ? referer : "/kich-thuoc");
    }

    @GetMapping("/delete/{id}")
    public String delete(@PathVariable Long id, RedirectAttributes redirectAttributes, HttpServletRequest request) {
        try {
            CoGiay coGiay = coGiayRepository.findById(id).orElse(null);
            if(coGiay != null) {
                coGiay.setTrangThai(coGiay.getTrangThai() != null ? !coGiay.getTrangThai() : false);
                coGiayRepository.save(coGiay);
                redirectAttributes.addFlashAttribute("successMessage", "Cập nhật trạng thái thành công");
            }
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Đã có lỗi xảy ra!");
        }
        String referer = request.getHeader("Referer");
        return "redirect:" + (referer != null ? referer : "/kich-thuoc");
    }
}
