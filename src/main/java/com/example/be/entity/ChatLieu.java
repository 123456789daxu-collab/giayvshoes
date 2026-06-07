package com.example.be.entity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "chat_lieu")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatLieu {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ma_chat_lieu")
    private String maChatLieu;

    @Column(name = "ten_chat_lieu")
    private String tenChatLieu;

    @Column(name = "trang_thai")
    private Boolean trangThai;
}