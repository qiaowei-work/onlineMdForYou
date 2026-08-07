package com.mdonline.controller;

import io.swagger.v3.oas.annotations.Operation;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.UUID;

@RestController
public class FileController {

    @Value("${app.upload-dir:./uploads}")
    private String uploadDir;

    @Operation(summary = "上传图片")
    @PostMapping("/api/upload")
    public Map<String, Object> upload(@RequestParam("file") MultipartFile file) throws IOException {
        // 只接受图片
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("只支持上传图片文件");
        }

        // 生成唯一文件名
        String originalName = file.getOriginalFilename();
        String ext = originalName != null && originalName.contains(".")
                ? originalName.substring(originalName.lastIndexOf("."))
                : ".png";
        String filename = UUID.randomUUID() + ext;

        // 确保目录存在
        Path dir = Paths.get(uploadDir);
        if (!Files.exists(dir)) Files.createDirectories(dir);

        // 保存文件
        File dest = dir.resolve(filename).toFile();
        file.transferTo(dest);

        String url = "/uploads/" + filename;
        return Map.of("url", url, "name", filename);
    }
}
