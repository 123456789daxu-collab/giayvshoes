package com.example.be.service;

import com.example.be.entity.LichLamViec;
import com.example.be.repository.LichLamViecRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class LichLamViecService {
    private final LichLamViecRepository lichLamViecRepository;

    public LichLamViecService(LichLamViecRepository lichLamViecRepository) {
        this.lichLamViecRepository = lichLamViecRepository;
    }

    public List<LichLamViec> findAll() {
        return lichLamViecRepository.findAll();
    }

    public LichLamViec save(LichLamViec lichLamViec) {
        return lichLamViecRepository.save(lichLamViec);
    }

    public LichLamViec findById(Long id) {
        return lichLamViecRepository.findById(id).orElse(null);
    }

    public void deleteById(Long id) {
        lichLamViecRepository.deleteById(id);
    }

    public List<LichLamViec> findByNgayLamViecBetween(LocalDate start, LocalDate end) {
        return lichLamViecRepository.findByNgayLamViecBetween(start, end);
    }
}
