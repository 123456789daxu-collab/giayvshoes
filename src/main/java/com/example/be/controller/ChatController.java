package com.example.be.controller;

import com.example.be.dto.ChatMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
@RequiredArgsConstructor
public class ChatController {

    private final SimpMessageSendingOperations messagingTemplate;

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
        // Gửi tới kênh /topic/admin để tất cả admin nhận được
        messagingTemplate.convertAndSend("/topic/admin", chatMessage);
    }

    // Admin gửi tin nhắn cho Khách hàng cụ thể (dựa vào sessionId)
    @MessageMapping("/chat.sendToCustomer")
    public void sendToCustomer(@Payload ChatMessage chatMessage) {
        // Gửi tới đích danh khách hàng có sessionId tương ứng
        messagingTemplate.convertAndSend("/topic/customer/" + chatMessage.getSessionId(), chatMessage);
    }

    // Sự kiện kết nối
    @MessageMapping("/chat.addUser")
    public void addUser(@Payload ChatMessage chatMessage, 
                        SimpMessageHeaderAccessor headerAccessor) {
        // Thêm sessionId vào websocket session để dùng lúc ngắt kết nối
        headerAccessor.getSessionAttributes().put("sessionId", chatMessage.getSessionId());
        headerAccessor.getSessionAttributes().put("username", chatMessage.getSender());
        
        // Gửi thông báo cho Admin biết có khách mới
        messagingTemplate.convertAndSend("/topic/admin", chatMessage);
    }
}
