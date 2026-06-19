package com.example.be.controller;

import jakarta.servlet.http.HttpServletRequest;

import com.example.be.entity.LoaiGiay;
import com.example.be.repository.LoaiGiayRepository;

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
    private LoaiGiayRepository loaiGiayRepository;

    @GetMapping
    public String index(Model model, 
                        @RequestParam(required = false) String keyword,
                        @RequestParam(required = false) Boolean trangThai,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "5") int size) {
        Pageable pageable = PageRequest.of(page, size, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "id"));
        Page<LoaiGiay> pageData;
        if ((keyword != null && !keyword.isEmpty()) || trangThai != null) {
            pageData = loaiGiayRepository.search(keyword, trangThai, pageable);
        } else {
            pageData = loaiGiayRepository.findAll(pageable);
        }
        model.addAttribute("pageData", pageData);
        model.addAttribute("keyword", keyword);
        model.addAttribute("trangThai", trangThai);
        return "de-giay";
    }

    @PostMapping("/add")
    public String add(@ModelAttribute LoaiGiay loaiGiay, RedirectAttributes redirectAttributes, HttpServletRequest request) {
        if (loaiGiay.getMaLoaiGiay() == null || loaiGiay.getMaLoaiGiay().trim().isEmpty()) {
            loaiGiay.setMaLoaiGiay("LG" + System.currentTimeMillis());
        }
        loaiGiayRepository.save(loaiGiay);
        redirectAttributes.addFlashAttribute("successMessage", "Thêm thành công");
        String referer = request.getHeader("Referer");
        return "redirect:" + (referer != null ? referer : "/de-giay");
    }

    @PostMapping("/update/{id}")
    public String update(@PathVariable Long id, @ModelAttribute LoaiGiay loaiGiay, RedirectAttributes redirectAttributes, HttpServletRequest request) {
        loaiGiay.setId(id);
        loaiGiayRepository.save(loaiGiay);
        redirectAttributes.addFlashAttribute("successMessage", "Cập nhật thành công");
        String referer = request.getHeader("Referer");
        return "redirect:" + (referer != null ? referer : "/de-giay");
    }

    @GetMapping("/delete/{id}")
    public String delete(@PathVariable Long id, RedirectAttributes redirectAttributes, HttpServletRequest request) {
        try {
            loaiGiayRepository.deleteById(id);
            redirectAttributes.addFlashAttribute("successMessage", "Xóa thành công");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Không thể xóa vì dữ liệu đang được sử dụng ở sản phẩm khác!");
        }
        String referer = request.getHeader("Referer");
        return "redirect:" + (referer != null ? referer : "/de-giay");
    }
}
