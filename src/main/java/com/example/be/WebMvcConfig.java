package com.example.be;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path avatarUploadDir = Paths.get("src/main/resources/static/images/avatars");
        registry.addResourceHandler("/images/avatars/**")
                .addResourceLocations(avatarUploadDir.toUri().toString());
    }
}
