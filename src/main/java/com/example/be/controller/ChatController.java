package com.example.be.controller;

import com.example.be.dto.ChatMessage;
import com.example.be.dto.ChatSessionDto;
import com.example.be.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Controller
@RequiredArgsConstructor
public class ChatController {

    private final SimpMessageSendingOperations messagingTemplate;
    private final ChatService chatService;

    // Trả về giao diện chat cho nhân viên
    @GetMapping("/chat")
    public String showChatPage() {
        return "chat";
    }
    
    // Giao diện demo cho khách hàng
    @GetMapping("/client-chat-widget")
    public String showClientChatWidget() {
        return "client-chat-widget";
    }

    // Khách hàng gửi tin nhắn cho Admin
    @MessageMapping("/chat.sendToAdmin")
    public void sendToAdmin(@Payload ChatMessage chatMessage) {
        // Lưu tin nhắn vào session history
        chatService.saveMessage(chatMessage);
        // Gửi tới kênh /topic/admin để tất cả admin nhận được
        messagingTemplate.convertAndSend("/topic/admin", chatMessage);
    }

    // Admin gửi tin nhắn cho Khách hàng cụ thể (dựa vào sessionId)
    @MessageMapping("/chat.sendToCustomer")
    public void sendToCustomer(@Payload ChatMessage chatMessage) {
        // Lưu tin nhắn vào session history
        chatService.saveMessage(chatMessage);
        // Gửi tới đích danh khách hàng có sessionId tương ứng
        messagingTemplate.convertAndSend("/topic/customer/" + chatMessage.getSessionId(), chatMessage);
    }

    // Sự kiện kết nối
    @MessageMapping("/chat.addUser")
    public void addUser(@Payload ChatMessage chatMessage, 
                        SimpMessageHeaderAccessor headerAccessor) {
        // Thêm sessionId vào websocket session để dùng lúc ngắt kết nối
        if (headerAccessor.getSessionAttributes() != null) {
            headerAccessor.getSessionAttributes().put("sessionId", chatMessage.getSessionId());
            headerAccessor.getSessionAttributes().put("username", chatMessage.getSender());
        }
        // Đăng ký phiên chat
        chatService.saveMessage(chatMessage);
        
        // Gửi thông báo cho Admin biết có khách mới
        messagingTemplate.convertAndSend("/topic/admin", chatMessage);
    }

    // REST API lấy danh sách tất cả các phiên chat (cho Admin)
    @GetMapping("/api/chat/sessions")
    @ResponseBody
    public ResponseEntity<List<ChatSessionDto>> getAllSessions() {
        return ResponseEntity.ok(chatService.getAllSessions());
    }

    // REST API lấy lịch sử tin nhắn của 1 phiên chat
    @GetMapping("/api/chat/history/{sessionId}")
    @ResponseBody
    public ResponseEntity<ChatSessionDto> getSessionHistory(@PathVariable String sessionId) {
        ChatSessionDto session = chatService.getSession(sessionId);
        if (session != null) {
            return ResponseEntity.ok(session);
        }
        return ResponseEntity.ok(ChatSessionDto.builder().sessionId(sessionId).build());
    }

    // REST API đóng phiên chat
    @PostMapping("/api/chat/close/{sessionId}")
    @ResponseBody
    public ResponseEntity<Void> closeSession(@PathVariable String sessionId) {
        chatService.closeSession(sessionId);
        return ResponseEntity.ok().build();
    }

    // REST API xóa phiên chat
    @DeleteMapping("/api/chat/session/{sessionId}")
    @ResponseBody
    public ResponseEntity<Void> deleteSession(@PathVariable String sessionId) {
        chatService.deleteSession(sessionId);
        return ResponseEntity.ok().build();
    }
}
