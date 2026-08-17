package com.example.be.service;

import com.example.be.entity.GiaoCa;
import com.example.be.repository.GiaoCaRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class GiaoCaService {
    private final GiaoCaRepository giaoCaRepository;

    public GiaoCaService(GiaoCaRepository giaoCaRepository) {
        this.giaoCaRepository = giaoCaRepository;
    }

    public List<GiaoCa> findAll() {
        return giaoCaRepository.findAll();
    }

    public GiaoCa save(GiaoCa giaoCa) {
        return giaoCaRepository.save(giaoCa);
    }

    public GiaoCa findById(Long id) {
        return giaoCaRepository.findById(id).orElse(null);
    }

    public void deleteById(Long id) {
        giaoCaRepository.deleteById(id);
    }

    public GiaoCa findActiveShift() {
        return giaoCaRepository.findFirstByTrangThaiOrderByIdDesc(0); // 0 = Đang trong ca
    }
}
