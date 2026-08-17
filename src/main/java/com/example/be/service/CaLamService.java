package com.example.be.service;

import com.example.be.entity.CaLam;
import com.example.be.repository.CaLamRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CaLamService {
    private final CaLamRepository caLamRepository;

    public CaLamService(CaLamRepository caLamRepository) {
        this.caLamRepository = caLamRepository;
    }

    public List<CaLam> findAll() {
        return caLamRepository.findAll();
    }

    public CaLam save(CaLam caLam) {
        return caLamRepository.save(caLam);
    }

    public CaLam findById(Long id) {
        return caLamRepository.findById(id).orElse(null);
    }

    public void deleteById(Long id) {
        caLamRepository.deleteById(id);
    }
}
