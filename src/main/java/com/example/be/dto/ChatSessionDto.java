package com.example.be.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ChatSessionDto {
    private String sessionId;
    private String sender;
    private String phone;
    private String startTime;
    private String lastTime;
    private String status; // "NEED_SUPPORT", "CHATTING", "CLOSED"
    
    @Builder.Default
    private List<ChatMessage> messages = new ArrayList<>();
}
