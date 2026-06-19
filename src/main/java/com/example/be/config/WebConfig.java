package com.example.be.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Ánh xạ đường dẫn /upload/** trực tiếp vào thư mục vật lý để ảnh hiển thị ngay lập tức
        // mà không cần phải khởi động lại server
        registry.addResourceHandler("/upload/**")
                .addResourceLocations("file:src/main/resources/static/upload/");
    }
}
