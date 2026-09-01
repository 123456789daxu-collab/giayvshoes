package com.example.be.repository;

import com.example.be.entity.ChatLieu;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ChatLieuRepository extends JpaRepository<ChatLieu, Long> {
    @Query("SELECT c FROM ChatLieu c WHERE (:keyword IS NULL OR (LOWER(c.tenChatLieu) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(c.maChatLieu) LIKE LOWER(CONCAT('%', :keyword, '%')))) AND (:trangThai IS NULL OR c.trangThai = :trangThai)")
    Page<ChatLieu> search(@Param("keyword") String keyword, @Param("trangThai") Boolean trangThai, Pageable pageable);

    Optional<ChatLieu> findByTenChatLieuIgnoreCase(String tenChatLieu);
}
