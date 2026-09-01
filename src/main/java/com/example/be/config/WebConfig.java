package com.example.be.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Autowired
    private ClientAuthInterceptor clientAuthInterceptor;
    
    @Autowired
    private NhanVienAuthInterceptor nhanVienAuthInterceptor;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path uploadDir = Paths.get("src/main/resources/static/upload").toAbsolutePath().normalize();
        Path targetUploadDir = Paths.get("target/classes/static/upload").toAbsolutePath().normalize();
        
        String uploadUri = uploadDir.toUri().toString();
        if (!uploadUri.endsWith("/")) uploadUri += "/";
        
        String targetUri = targetUploadDir.toUri().toString();
        if (!targetUri.endsWith("/")) targetUri += "/";
        
        registry.addResourceHandler("/upload/**")
                .addResourceLocations(uploadUri, targetUri, "file:src/main/resources/static/upload/", "file:target/classes/static/upload/", "classpath:/static/upload/");
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // Apply the interceptor to client-facing routes and APIs
        registry.addInterceptor(clientAuthInterceptor)
                .addPathPatterns("/client/**", "/api/auth/**", "/api/khach-hang/**", "/api/address/**")
                .excludePathPatterns("/client/dang-nhap", "/client/dang-ky", "/api/auth/dang-nhap", "/api/auth/dang-ky");
                
        // Apply the NhanVien interceptor to check staff/admin accounts status
        registry.addInterceptor(nhanVienAuthInterceptor)
                .addPathPatterns("/**")
                .excludePathPatterns(
                    "/css/**", "/js/**", "/images/**", "/webjars/**",
                    "/trang-chu", "/client/**", "/api/san-pham/**", "/api/phieu-giam-gia/check", 
                    "/api/phieu-giam-gia/list", "/api/hoa-don/ban-hang", "/api/hoa-don/*/send-email", 
                    "/api/hoa-don/test-email", "/upload/**", "/api/auth/**", "/api/client/**", 
                    "/api/address/**", "/ws-chat/**", "/client-chat-widget", "/api/chat/history/**",
                    "/api/payment/vnpay/**", "/dang-nhap", "/logout", "/error"
                );
    }
}
