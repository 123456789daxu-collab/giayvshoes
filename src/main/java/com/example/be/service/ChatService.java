package com.example.be.service;

import com.example.be.dto.ChatMessage;
import com.example.be.dto.ChatSessionDto;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ChatService {

    // Lưu các phiên chat trong bộ nhớ máy chủ (SessionId -> ChatSessionDto)
    private final Map<String, ChatSessionDto> sessions = new ConcurrentHashMap<>();

    public ChatSessionDto getOrCreateSession(String sessionId, String sender, String phone, String timeStr, String status) {
        return sessions.computeIfAbsent(sessionId, id -> {
            String defaultSender = sender;
            if (defaultSender == null || defaultSender.trim().isEmpty() || "Trợ lý AI".equals(defaultSender) || "CSKH VShoes".equals(defaultSender)) {
                String code = id.replace("CUS_", "").replace("USER_", "");
                defaultSender = "Khách hàng #" + code;
            }
            return ChatSessionDto.builder()
                    .sessionId(id)
                    .sender(defaultSender)
                    .phone((phone != null && !phone.trim().isEmpty()) ? phone : "Chưa cung cấp SĐT")
                    .startTime(timeStr != null ? timeStr : "")
                    .lastTime(timeStr != null ? timeStr : "")
                    .status(status != null ? status : "NEED_SUPPORT")
                    .messages(new ArrayList<>())
                    .build();
        });
    }

    public synchronized void saveMessage(ChatMessage message) {
        if (message == null || message.getSessionId() == null || message.getSessionId().trim().isEmpty()) {
            return;
        }

        String sessionId = message.getSessionId().trim();
        ChatSessionDto session = sessions.get(sessionId);

        String initialSender = ("BOT".equals(message.getSenderRole()) || "ADMIN".equals(message.getSenderRole())) ? null : message.getSender();
        if (session == null) {
            session = getOrCreateSession(sessionId, initialSender, message.getPhone(), message.getTimestamp(), message.getStatus());
        }

        // Cập nhật thông tin khách hàng nếu có
        if (message.getSender() != null && !"Trợ lý AI".equals(message.getSender()) 
                && !"CSKH VShoes".equals(message.getSender()) 
                && !"BOT".equals(message.getSenderRole()) 
                && !"ADMIN".equals(message.getSenderRole())) {
            session.setSender(message.getSender());
        }

        if (message.getPhone() != null && !message.getPhone().trim().isEmpty() && !"Chưa cung cấp SĐT".equals(message.getPhone())) {
            session.setPhone(message.getPhone());
        }

        if (message.getTimestamp() != null && !message.getTimestamp().trim().isEmpty()) {
            session.setLastTime(message.getTimestamp());
            if (session.getStartTime() == null || session.getStartTime().trim().isEmpty()) {
                session.setStartTime(message.getTimestamp());
            }
        }

        if (message.getStatus() != null && !message.getStatus().trim().isEmpty()) {
            session.setStatus(message.getStatus());
        }

        // Lưu tin nhắn vào lịch sử phiên
        if (message.getType() == ChatMessage.MessageType.CHAT && message.getContent() != null && !message.getContent().trim().isEmpty()) {
            session.getMessages().add(message);
        } else if (message.getType() == ChatMessage.MessageType.CLOSE_SESSION) {
            session.setStatus("CLOSED");
            if (message.getContent() != null && !message.getContent().trim().isEmpty()) {
                session.getMessages().add(message);
            }
        }
    }

    public List<ChatSessionDto> getAllSessions() {
        List<ChatSessionDto> list = new ArrayList<>(sessions.values());
        // Giữ thứ tự hoặc xếp theo thời gian mới nhất
        return list;
    }

    public ChatSessionDto getSession(String sessionId) {
        if (sessionId == null) return null;
        return sessions.get(sessionId);
    }

    public void closeSession(String sessionId) {
        if (sessionId == null) return;
        ChatSessionDto session = sessions.get(sessionId);
        if (session != null) {
            session.setStatus("CLOSED");
        }
    }

    public void deleteSession(String sessionId) {
        if (sessionId == null) return;
        sessions.remove(sessionId);
    }
}
