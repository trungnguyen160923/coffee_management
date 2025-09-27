package com.service.catalog.service;

import com.service.catalog.repository.ProductRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Slf4j
public class ImageCleanupService {

    private final ProductRepository productRepository;

    @Value("${app.upload.dir:./uploads}")
    private String uploadDir;

    public ImageCleanupService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    /**
     * Chạy cleanup mỗi ngày lúc 2:00 AM
     */
    @Scheduled(cron = "0 0 */6 * * ?")
    public void cleanupUnusedImages() {
        log.info("Starting image cleanup job...");
        
        try {
            // Lấy tất cả ảnh đang được sử dụng trong database
            Set<String> usedImages = getUsedImageUrls();
            log.info("Found {} used images in database", usedImages.size());
            
            // Lấy tất cả ảnh trong thư mục
            Path imagesDir = Paths.get(uploadDir, "images", "products");
            if (!Files.exists(imagesDir)) {
                log.info("Images directory does not exist, skipping cleanup");
                return;
            }
            
            List<Path> allImages = Files.list(imagesDir)
                    .filter(Files::isRegularFile)
                    .collect(Collectors.toList());
            
            log.info("Found {} images in directory", allImages.size());
            
            int deletedCount = 0;
            for (Path imagePath : allImages) {
                String fileName = imagePath.getFileName().toString();
                String imageUrl = "/files/images/products/" + fileName;
                
                // Nếu ảnh không được sử dụng trong database
                if (!usedImages.contains(imageUrl)) {
                    try {
                        Files.delete(imagePath);
                        deletedCount++;
                        log.info("Deleted unused image: {}", fileName);
                    } catch (IOException e) {
                        log.error("Failed to delete image {}: {}", fileName, e.getMessage());
                    }
                }
            }
            
            log.info("Image cleanup completed. Deleted {} unused images", deletedCount);
            
        } catch (Exception e) {
            log.error("Error during image cleanup: {}", e.getMessage(), e);
        }
    }

    /**
     * Lấy tất cả URL ảnh đang được sử dụng trong database
     */
    private Set<String> getUsedImageUrls() {
        return productRepository.findAll()
                .stream()
                .map(product -> product.getImageUrl())
                .filter(imageUrl -> imageUrl != null && !imageUrl.isEmpty())
                .collect(Collectors.toSet());
    }

    /**
     * Cleanup thủ công (có thể gọi từ API)
     */
    public int cleanupUnusedImagesManual() {
        log.info("Starting manual image cleanup...");
        
        try {
            Set<String> usedImages = getUsedImageUrls();
            Path imagesDir = Paths.get(uploadDir, "images", "products");
            
            if (!Files.exists(imagesDir)) {
                return 0;
            }
            
            List<Path> allImages = Files.list(imagesDir)
                    .filter(Files::isRegularFile)
                    .collect(Collectors.toList());
            
            int deletedCount = 0;
            for (Path imagePath : allImages) {
                String fileName = imagePath.getFileName().toString();
                String imageUrl = "/files/images/products/" + fileName;
                
                if (!usedImages.contains(imageUrl)) {
                    try {
                        Files.delete(imagePath);
                        deletedCount++;
                        log.info("Deleted unused image: {}", fileName);
                    } catch (IOException e) {
                        log.error("Failed to delete image {}: {}", fileName, e.getMessage());
                    }
                }
            }
            
            log.info("Manual cleanup completed. Deleted {} unused images", deletedCount);
            return deletedCount;
            
        } catch (Exception e) {
            log.error("Error during manual cleanup: {}", e.getMessage(), e);
            return 0;
        }
    }
}
