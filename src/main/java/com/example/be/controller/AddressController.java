package com.example.be.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

/**
 * Proxy controller for Vietnam administrative divisions API.
 * Routes frontend requests to provinces.open-api.vn to avoid CORS issues.
 */
@RestController
@RequestMapping("/api/address")
public class AddressController {

    private final RestTemplate restTemplate = new RestTemplate();
    private static final String PROVINCES_API = "https://provinces.open-api.vn/api";

    @GetMapping("/provinces")
    public ResponseEntity<String> getProvinces() {
        try {
            String url = PROVINCES_API + "/p/";
            String body = restTemplate.getForObject(url, String.class);
            return ResponseEntity.ok()
                    .header("Content-Type", "application/json;charset=UTF-8")
                    .body(body);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("[]");
        }
    }

    @GetMapping("/districts/{provinceCode}")
    public ResponseEntity<String> getDistricts(@PathVariable String provinceCode) {
        try {
            String url = PROVINCES_API + "/p/" + provinceCode + "?depth=2";
            String body = restTemplate.getForObject(url, String.class);
            return ResponseEntity.ok()
                    .header("Content-Type", "application/json;charset=UTF-8")
                    .body(body);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("{\"districts\":[]}");
        }
    }

    @GetMapping("/wards/{districtCode}")
    public ResponseEntity<String> getWards(@PathVariable String districtCode) {
        try {
            String url = PROVINCES_API + "/d/" + districtCode + "?depth=2";
            String body = restTemplate.getForObject(url, String.class);
            return ResponseEntity.ok()
                    .header("Content-Type", "application/json;charset=UTF-8")
                    .body(body);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("{\"wards\":[]}");
        }
    }
}
