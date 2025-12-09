package com.service.catalog.service;

import com.service.catalog.repository.ProductRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashSet;
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
     * Chạy cleanup mỗi 6 giờ
     */
    @Scheduled(cron = "0 0 */6 * * ?")
    public void cleanupUnusedImages() {
        log.info("Starting image cleanup job...");
        
        try {
            // Lấy tất cả filename đang được sử dụng trong database
            Set<String> usedFilenames = getUsedImageFilenames();
            log.info("Found {} used image filenames in database", usedFilenames.size());
            if (log.isDebugEnabled()) {
                log.debug("Used filenames: {}", usedFilenames);
            }
            
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
            int keptCount = 0;
            for (Path imagePath : allImages) {
                String fileName = imagePath.getFileName().toString();
                
                // So sánh filename thay vì so sánh toàn bộ URL
                if (!usedFilenames.contains(fileName)) {
                    try {
                        Files.delete(imagePath);
                        deletedCount++;
                        log.info("Deleted unused image: {}", fileName);
                    } catch (IOException e) {
                        log.error("Failed to delete image {}: {}", fileName, e.getMessage());
                    }
                } else {
                    keptCount++;
                    if (log.isDebugEnabled()) {
                        log.debug("Keeping used image: {}", fileName);
                    }
                }
            }
            
            log.info("Image cleanup completed. Deleted {} unused images, kept {} used images", 
                    deletedCount, keptCount);
            
        } catch (Exception e) {
            log.error("Error during image cleanup: {}", e.getMessage(), e);
        }
    }

    /**
     * Lấy tất cả filename ảnh đang được sử dụng trong database
     * Extract filename từ URL (xử lý các trường hợp có domain, context-path, query params)
     */
    private Set<String> getUsedImageFilenames() {
        Set<String> filenames = new HashSet<>();
        
        productRepository.findAll()
                .stream()
                .map(product -> product.getImageUrl())
                .filter(imageUrl -> imageUrl != null && !imageUrl.isEmpty())
                .forEach(imageUrl -> {
                    String filename = extractFilenameFromUrl(imageUrl);
                    if (filename != null && !filename.isEmpty()) {
                        filenames.add(filename);
                        if (log.isDebugEnabled()) {
                            log.debug("Extracted filename '{}' from URL '{}'", filename, imageUrl);
                        }
                    } else {
                        log.warn("Could not extract filename from URL: {}", imageUrl);
                    }
                });
        
        return filenames;
    }

    /**
     * Extract filename từ URL, xử lý các trường hợp:
     * - URL có domain: http://example.com/files/images/products/filename.jpg
     * - URL có context-path: /catalogs/files/images/products/filename.jpg
     * - URL đơn giản: /files/images/products/filename.jpg
     * - URL có query params: /files/images/products/filename.jpg?version=1
     * - Chỉ có filename: filename.jpg
     */
    private String extractFilenameFromUrl(String imageUrl) {
        if (imageUrl == null || imageUrl.isEmpty()) {
            return null;
        }
        
        try {
            // Loại bỏ query params và fragment nếu có
            String urlWithoutQuery = imageUrl;
            int queryIndex = imageUrl.indexOf('?');
            if (queryIndex > 0) {
                urlWithoutQuery = imageUrl.substring(0, queryIndex);
            }
            int fragmentIndex = urlWithoutQuery.indexOf('#');
            if (fragmentIndex > 0) {
                urlWithoutQuery = urlWithoutQuery.substring(0, fragmentIndex);
            }
            
            // Nếu là URL đầy đủ (có protocol), parse bằng URI
            if (urlWithoutQuery.contains("://")) {
                try {
                    URI uri = new URI(urlWithoutQuery);
                    String path = uri.getPath();
                    if (path != null && !path.isEmpty()) {
                        // Lấy phần cuối cùng của path (filename)
                        int lastSlash = path.lastIndexOf('/');
                        if (lastSlash >= 0 && lastSlash < path.length() - 1) {
                            return path.substring(lastSlash + 1);
                        }
                        return path;
                    }
                } catch (URISyntaxException e) {
                    log.warn("Invalid URI format: {}", urlWithoutQuery);
                }
            }
            
            // Nếu là relative path, lấy phần cuối cùng sau dấu /
            int lastSlash = urlWithoutQuery.lastIndexOf('/');
            if (lastSlash >= 0 && lastSlash < urlWithoutQuery.length() - 1) {
                return urlWithoutQuery.substring(lastSlash + 1);
            }
            
            // Nếu không có dấu /, coi như đã là filename
            return urlWithoutQuery;
            
        } catch (Exception e) {
            log.warn("Error extracting filename from URL '{}': {}", imageUrl, e.getMessage());
            return null;
        }
    }

    /**
     * Cleanup thủ công (có thể gọi từ API)
     */
    public int cleanupUnusedImagesManual() {
        log.info("Starting manual image cleanup...");
        
        try {
            // Lấy tất cả filename đang được sử dụng trong database
            Set<String> usedFilenames = getUsedImageFilenames();
            log.info("Found {} used image filenames in database", usedFilenames.size());
            
            Path imagesDir = Paths.get(uploadDir, "images", "products");
            
            if (!Files.exists(imagesDir)) {
                log.info("Images directory does not exist");
                return 0;
            }
            
            List<Path> allImages = Files.list(imagesDir)
                    .filter(Files::isRegularFile)
                    .collect(Collectors.toList());
            
            log.info("Found {} images in directory", allImages.size());
            
            int deletedCount = 0;
            int keptCount = 0;
            for (Path imagePath : allImages) {
                String fileName = imagePath.getFileName().toString();
                
                // So sánh filename thay vì so sánh toàn bộ URL
                if (!usedFilenames.contains(fileName)) {
                    try {
                        Files.delete(imagePath);
                        deletedCount++;
                        log.info("Deleted unused image: {}", fileName);
                    } catch (IOException e) {
                        log.error("Failed to delete image {}: {}", fileName, e.getMessage());
                    }
                } else {
                    keptCount++;
                    if (log.isDebugEnabled()) {
                        log.debug("Keeping used image: {}", fileName);
                    }
                }
            }
            
            log.info("Manual cleanup completed. Deleted {} unused images, kept {} used images", 
                    deletedCount, keptCount);
            return deletedCount;
            
        } catch (Exception e) {
            log.error("Error during manual cleanup: {}", e.getMessage(), e);
            return 0;
        }
    }
}
