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

    public String generateNextMaCa() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        java.security.SecureRandom random = new java.security.SecureRandom();
        String code;
        do {
            StringBuilder sb = new StringBuilder("CA");
            for (int i = 0; i < 6; i++) {
                sb.append(chars.charAt(random.nextInt(chars.length())));
            }
            code = sb.toString();
        } while (caLamRepository.existsByMaCa(code));
        return code;
    }

    public void deleteById(Long id) {
        caLamRepository.deleteById(id);
    }
}
