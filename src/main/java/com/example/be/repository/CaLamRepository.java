package com.example.be.repository;

import com.example.be.entity.CaLam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CaLamRepository extends JpaRepository<CaLam, Long> {
}
