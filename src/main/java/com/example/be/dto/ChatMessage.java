package com.example.be.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ChatMessage {
    private MessageType type;
    private String content;
    private String sender;
    private String sessionId;
    private String phone;
    private String senderRole; // "CUSTOMER", "BOT", "ADMIN"
    private String status;     // "NEED_SUPPORT", "CHATTING", "CLOSED"
    private String timestamp;

    public enum MessageType {
        CHAT,
        JOIN,
        LEAVE,
        CLOSE_SESSION
    }
}
