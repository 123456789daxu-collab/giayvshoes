package com.example.be;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/css/**", "/js/**", "/images/**", "/webjars/**").permitAll()
                .requestMatchers("/trang-chu", "/client/**", "/api/san-pham/**", "/api/phieu-giam-gia/check", "/api/phieu-giam-gia/list", "/api/hoa-don/ban-hang", "/api/hoa-don/*/send-email", "/api/hoa-don/test-email", "/upload/**", "/api/auth/**", "/api/client/**", "/api/address/**").permitAll()


                // Require ADMIN for Thống kê, Hóa đơn, Khách hàng, Đợt giảm giá
                .requestMatchers("/thong-ke/**", "/hoa-don/**", "/khach-hang/**", "/tai-khoan/khach-hang/**", "/dot-giam-gia/**", "/api/thong-ke/**", "/api/hoa-don/**", "/api/khach-hang/**", "/api/dot-giam-gia/**").hasRole("ADMIN")
                // Allow both ADMIN and STAFF for Ban hang, San pham, Phieu giam gia, Nhan vien, Giao ca, Danh gia
                .requestMatchers("/ban-hang/**", "/san-pham/**", "/phieu-giam-gia/**", "/nhan-vien/**", "/tai-khoan/nhan-vien/**", "/lich-lam-viec/**", "/danh-gia/**", "/api/**").hasAnyRole("ADMIN", "STAFF")
                .anyRequest().authenticated()
            )
            .formLogin(form -> form
                .loginPage("/dang-nhap")
                .loginProcessingUrl("/dang-nhap")
                .successHandler((request, response, authentication) -> {
                    boolean isAdmin = authentication.getAuthorities().stream()
                            .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
                    if (isAdmin) {
                        response.sendRedirect("/thong-ke");
                    } else {
                        response.sendRedirect("/ban-hang");
                    }
                })
                .permitAll()
            )
            .logout(logout -> logout
                .logoutUrl("/logout")
                .logoutSuccessUrl("/dang-nhap?logout")
                .permitAll()
            )
            .csrf(csrf -> csrf.disable())
            .headers(headers -> headers.frameOptions(frame -> frame.disable()));
        return http.build();
    }

    @Bean
    @SuppressWarnings("deprecation")
    public org.springframework.security.crypto.password.PasswordEncoder passwordEncoder() {
        return org.springframework.security.crypto.password.NoOpPasswordEncoder.getInstance();
    }
}
