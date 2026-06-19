package com.example.be.controller;

import jakarta.servlet.http.HttpServletRequest;

import com.example.be.entity.ChatLieu;
import com.example.be.repository.ChatLieuRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/chat-lieu")
public class ChatLieuController {

    @Autowired
    private ChatLieuRepository chatLieuRepository;

    @GetMapping
    public String index(Model model, 
                        @RequestParam(required = false) String keyword,
                        @RequestParam(required = false) Boolean trangThai,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "5") int size) {
        Pageable pageable = PageRequest.of(page, size, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "id"));
        Page<ChatLieu> pageData;
        if ((keyword != null && !keyword.isEmpty()) || trangThai != null) {
            pageData = chatLieuRepository.search(keyword, trangThai, pageable);
        } else {
            pageData = chatLieuRepository.findAll(pageable);
        }
        model.addAttribute("pageData", pageData);
        model.addAttribute("keyword", keyword);
        model.addAttribute("trangThai", trangThai);
        return "chat-lieu";
    }

    @PostMapping("/add")
    public String add(@ModelAttribute ChatLieu chatLieu, RedirectAttributes redirectAttributes, HttpServletRequest request) {
        chatLieuRepository.save(chatLieu);
        redirectAttributes.addFlashAttribute("successMessage", "Thêm thành công");
        String referer = request.getHeader("Referer");
        return "redirect:" + (referer != null ? referer : "/chat-lieu");
    }

    @PostMapping("/update/{id}")
    public String update(@PathVariable Long id, @ModelAttribute ChatLieu chatLieu, RedirectAttributes redirectAttributes, HttpServletRequest request) {
        chatLieu.setId(id);
        chatLieuRepository.save(chatLieu);
        redirectAttributes.addFlashAttribute("successMessage", "Cập nhật thành công");
        String referer = request.getHeader("Referer");
        return "redirect:" + (referer != null ? referer : "/chat-lieu");
    }

    @GetMapping("/delete/{id}")
    public String delete(@PathVariable Long id, RedirectAttributes redirectAttributes, HttpServletRequest request) {
        try {
            chatLieuRepository.deleteById(id);
            redirectAttributes.addFlashAttribute("successMessage", "Xóa thành công");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Không thể xóa vì dữ liệu đang được sử dụng ở sản phẩm khác!");
        }
        String referer = request.getHeader("Referer");
        return "redirect:" + (referer != null ? referer : "/chat-lieu");
    }
}
