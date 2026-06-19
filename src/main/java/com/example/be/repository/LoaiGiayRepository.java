package com.example.be.repository;

import com.example.be.entity.LoaiGiay;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LoaiGiayRepository extends JpaRepository<LoaiGiay, Long> {
}
