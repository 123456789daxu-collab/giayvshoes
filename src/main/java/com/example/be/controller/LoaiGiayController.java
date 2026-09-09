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
        model.addAttribute("nextMaLoaiGiay", generateNextMaLoaiGiay());
        return "de-giay";
    }

    private String generateNextMaLoaiGiay() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        java.security.SecureRandom random = new java.security.SecureRandom();
        String code;
        do {
            StringBuilder sb = new StringBuilder("LG");
            for (int i = 0; i < 6; i++) {
                sb.append(chars.charAt(random.nextInt(chars.length())));
            }
            code = sb.toString();
        } while (loaiGiayRepository.existsByMaLoaiGiay(code));
        return code;
    }

    @PostMapping("/add")
    public String add(@ModelAttribute LoaiGiay loaiGiay, RedirectAttributes redirectAttributes, HttpServletRequest request) {
        String referer = request.getHeader("Referer");
        if (loaiGiay.getTenLoaiGiay() == null || loaiGiay.getTenLoaiGiay().trim().isEmpty()) {
            redirectAttributes.addFlashAttribute("errorMessage", "Tên loại giày không được để trống!");
            return "redirect:" + (referer != null ? referer : "/de-giay");
        }
        String tenTrimmed = loaiGiay.getTenLoaiGiay().trim();

        java.util.Optional<LoaiGiay> existing = loaiGiayRepository.findByTenLoaiGiayIgnoreCase(tenTrimmed);
        if (existing.isPresent()) {
            redirectAttributes.addFlashAttribute("errorMessage", "Thêm thất bại! Loại giày này đã tồn tại trong hệ thống.");
            return "redirect:" + (referer != null ? referer : "/de-giay");
        }

        loaiGiay.setTenLoaiGiay(tenTrimmed);
        if (loaiGiay.getMaLoaiGiay() == null || loaiGiay.getMaLoaiGiay().trim().isEmpty() || "(Tự động sinh)".equals(loaiGiay.getMaLoaiGiay().trim())) {
            loaiGiay.setMaLoaiGiay(generateNextMaLoaiGiay());
        }
        loaiGiay.setTrangThai(true);
        try {
            loaiGiayRepository.save(loaiGiay);
            redirectAttributes.addFlashAttribute("successMessage", "Thêm thành công");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Thêm thất bại! Tên hoặc mã có thể đã tồn tại.");
        }
        return "redirect:" + (referer != null ? referer : "/de-giay");
    }

    @PostMapping("/update/{id}")
    public String update(@PathVariable Long id, @ModelAttribute LoaiGiay loaiGiay, RedirectAttributes redirectAttributes, HttpServletRequest request) {
        String referer = request.getHeader("Referer");
        if (loaiGiay.getTenLoaiGiay() == null || loaiGiay.getTenLoaiGiay().trim().isEmpty()) {
            redirectAttributes.addFlashAttribute("errorMessage", "Tên loại giày không được để trống!");
            return "redirect:" + (referer != null ? referer : "/de-giay");
        }
        String tenTrimmed = loaiGiay.getTenLoaiGiay().trim();

        java.util.Optional<LoaiGiay> existing = loaiGiayRepository.findByTenLoaiGiayIgnoreCase(tenTrimmed);
        if (existing.isPresent() && !existing.get().getId().equals(id)) {
            redirectAttributes.addFlashAttribute("errorMessage", "Cập nhật thất bại! Tên loại giày đã trùng với loại giày khác.");
            return "redirect:" + (referer != null ? referer : "/de-giay");
        }

        loaiGiay.setId(id);
        loaiGiay.setTenLoaiGiay(tenTrimmed);
        try {
            loaiGiayRepository.save(loaiGiay);
            redirectAttributes.addFlashAttribute("successMessage", "Cập nhật thành công");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Cập nhật thất bại! Tên hoặc mã có thể đã tồn tại.");
        }
        return "redirect:" + (referer != null ? referer : "/de-giay");
    }

    @GetMapping("/delete/{id}")
    public String delete(@PathVariable Long id, RedirectAttributes redirectAttributes, HttpServletRequest request) {
        try {
            LoaiGiay loaiGiay = loaiGiayRepository.findById(id).orElse(null);
            if (loaiGiay != null) {
                loaiGiay.setTrangThai(loaiGiay.getTrangThai() != null ? !loaiGiay.getTrangThai() : false);
                loaiGiayRepository.save(loaiGiay);
                redirectAttributes.addFlashAttribute("successMessage", "Cập nhật trạng thái thành công");
            }
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Lỗi khi cập nhật trạng thái!");
        }
        String referer = request.getHeader("Referer");
        return "redirect:" + (referer != null ? referer : "/de-giay");
    }
}
