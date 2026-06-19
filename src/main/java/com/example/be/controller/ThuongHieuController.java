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
        if (thuongHieu.getMaThuongHieu() == null || thuongHieu.getMaThuongHieu().trim().isEmpty()) {
            thuongHieu.setMaThuongHieu("TH" + System.currentTimeMillis());
        }
        thuongHieuRepository.save(thuongHieu);
        redirectAttributes.addFlashAttribute("successMessage", "Thêm thành công");
        String referer = request.getHeader("Referer");
        return "redirect:" + (referer != null ? referer : "/thuong-hieu");
    }

    @PostMapping("/update/{id}")
    public String update(@PathVariable Long id, @ModelAttribute ThuongHieu thuongHieu, RedirectAttributes redirectAttributes, HttpServletRequest request) {
        thuongHieu.setId(id);
        thuongHieuRepository.save(thuongHieu);
        redirectAttributes.addFlashAttribute("successMessage", "Cập nhật thành công");
        String referer = request.getHeader("Referer");
        return "redirect:" + (referer != null ? referer : "/thuong-hieu");
    }

    @GetMapping("/delete/{id}")
    public String delete(@PathVariable Long id, RedirectAttributes redirectAttributes, HttpServletRequest request) {
        try {
            thuongHieuRepository.deleteById(id);
            redirectAttributes.addFlashAttribute("successMessage", "Xóa thành công");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Không thể xóa vì dữ liệu đang được sử dụng ở sản phẩm khác!");
        }
        String referer = request.getHeader("Referer");
        return "redirect:" + (referer != null ? referer : "/thuong-hieu");
    }
}
