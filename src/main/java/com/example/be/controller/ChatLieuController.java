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
        String referer = request.getHeader("Referer");
        if (chatLieu.getTenChatLieu() == null || chatLieu.getTenChatLieu().trim().isEmpty()) {
            redirectAttributes.addFlashAttribute("errorMessage", "Tên chất liệu không được để trống!");
            return "redirect:" + (referer != null ? referer : "/chat-lieu");
        }
        String tenTrimmed = chatLieu.getTenChatLieu().trim();

        java.util.Optional<ChatLieu> existing = chatLieuRepository.findByTenChatLieuIgnoreCase(tenTrimmed);
        if (existing.isPresent()) {
            redirectAttributes.addFlashAttribute("errorMessage", "Thêm thất bại! Chất liệu này đã tồn tại trong hệ thống.");
            return "redirect:" + (referer != null ? referer : "/chat-lieu");
        }

        chatLieu.setTenChatLieu(tenTrimmed);
        if (chatLieu.getMaChatLieu() == null || chatLieu.getMaChatLieu().trim().isEmpty() || "(Tự động sinh)".equals(chatLieu.getMaChatLieu().trim())) {
            chatLieu.setMaChatLieu("CL" + System.currentTimeMillis());
        }
        chatLieu.setTrangThai(true);
        try {
            chatLieuRepository.save(chatLieu);
            redirectAttributes.addFlashAttribute("successMessage", "Thêm thành công");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Thêm thất bại! Tên hoặc mã có thể đã tồn tại.");
        }
        return "redirect:" + (referer != null ? referer : "/chat-lieu");
    }

    @PostMapping("/update/{id}")
    public String update(@PathVariable Long id, @ModelAttribute ChatLieu chatLieu, RedirectAttributes redirectAttributes, HttpServletRequest request) {
        String referer = request.getHeader("Referer");
        if (chatLieu.getTenChatLieu() == null || chatLieu.getTenChatLieu().trim().isEmpty()) {
            redirectAttributes.addFlashAttribute("errorMessage", "Tên chất liệu không được để trống!");
            return "redirect:" + (referer != null ? referer : "/chat-lieu");
        }
        String tenTrimmed = chatLieu.getTenChatLieu().trim();

        java.util.Optional<ChatLieu> existing = chatLieuRepository.findByTenChatLieuIgnoreCase(tenTrimmed);
        if (existing.isPresent() && !existing.get().getId().equals(id)) {
            redirectAttributes.addFlashAttribute("errorMessage", "Cập nhật thất bại! Tên chất liệu đã trùng với chất liệu khác.");
            return "redirect:" + (referer != null ? referer : "/chat-lieu");
        }

        chatLieu.setId(id);
        chatLieu.setTenChatLieu(tenTrimmed);
        try {
            chatLieuRepository.save(chatLieu);
            redirectAttributes.addFlashAttribute("successMessage", "Cập nhật thành công");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Cập nhật thất bại! Tên hoặc mã có thể đã tồn tại.");
        }
        return "redirect:" + (referer != null ? referer : "/chat-lieu");
    }

    @GetMapping("/delete/{id}")
    public String delete(@PathVariable Long id, RedirectAttributes redirectAttributes, HttpServletRequest request) {
        try {
            ChatLieu chatLieu = chatLieuRepository.findById(id).orElse(null);
            if (chatLieu != null) {
                chatLieu.setTrangThai(chatLieu.getTrangThai() != null ? !chatLieu.getTrangThai() : false);
                chatLieuRepository.save(chatLieu);
                redirectAttributes.addFlashAttribute("successMessage", "Cập nhật trạng thái thành công");
            }
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Lỗi khi cập nhật trạng thái!");
        }
        String referer = request.getHeader("Referer");
        return "redirect:" + (referer != null ? referer : "/chat-lieu");
    }
}
