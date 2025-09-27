package com.service.catalog.controller;

import com.service.catalog.dto.ApiResponse;
import com.service.catalog.service.ImageCleanupService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@RestController
@RequestMapping("/files")
@Slf4j
public class FileController {

    @Value("${app.upload.dir:./uploads}")
    private String uploadDir;
    
    private final ImageCleanupService imageCleanupService;
    
    public FileController(ImageCleanupService imageCleanupService) {
        this.imageCleanupService = imageCleanupService;
    }

    @PostMapping("/upload")
    public ApiResponse<String> uploadFile(@RequestParam("file") MultipartFile file) {
        try {
            // Validate file
            if (file.isEmpty()) {
                return ApiResponse.<String>builder()
                        .code(4001)
                        .message("File is empty")
                        .build();
            }

            // Validate file type
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                return ApiResponse.<String>builder()
                        .code(4002)
                        .message("Only image files are allowed")
                        .build();
            }

            // Validate file size (10MB)
            if (file.getSize() > 10 * 1024 * 1024) {
                return ApiResponse.<String>builder()
                        .code(4003)
                        .message("File size must be less than 10MB")
                        .build();
            }

            // Tạo thư mục nếu chưa tồn tại
            Path uploadPath = Paths.get(uploadDir, "images", "products");
            Files.createDirectories(uploadPath);

            // Generate unique filename
            String originalFilename = file.getOriginalFilename();
            String extension = originalFilename != null ? 
                originalFilename.substring(originalFilename.lastIndexOf(".")) : "";
            String filename = UUID.randomUUID().toString() + extension;

            // Save file
            Path filePath = uploadPath.resolve(filename);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // Return file URL
            String fileUrl = "/files/images/products/" + filename;
            
            log.info("File uploaded successfully: {}", fileUrl);
            
            return ApiResponse.<String>builder()
                    .result(fileUrl)
                    .build();

        } catch (IOException e) {
            log.error("Error uploading file: {}", e.getMessage());
            return ApiResponse.<String>builder()
                    .code(5000)
                    .message("Error uploading file: " + e.getMessage())
                    .build();
        }
    }

    @GetMapping("/images/products/{filename}")
    public ResponseEntity<Resource> getImage(@PathVariable String filename) {
        try {
            Path filePath = Paths.get(uploadDir, "images", "products", filename);
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists() && resource.isReadable()) {
                // Determine content type
                String contentType = Files.probeContentType(filePath);
                if (contentType == null) {
                    contentType = "application/octet-stream";
                }

                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            log.error("Error serving file: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Cleanup ảnh không sử dụng (chỉ admin)
     */
    @PostMapping("/cleanup")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Integer> cleanupUnusedImages() {
        int deletedCount = imageCleanupService.cleanupUnusedImagesManual();
        
        return ApiResponse.<Integer>builder()
                .result(deletedCount)
                .message("Cleaned up " + deletedCount + " unused images")
                .build();
    }
}
