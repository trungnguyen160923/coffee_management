package com.service.catalog.service;

import com.service.catalog.dto.request.ProductCreationRequest;
import com.service.catalog.dto.response.ProductDetailResponse;
import com.service.catalog.dto.response.ProductResponse;
import com.service.catalog.entity.Category;
import com.service.catalog.entity.Product;
import com.service.catalog.entity.ProductDetail;
import com.service.catalog.entity.Size;
import com.service.catalog.exception.AppException;
import com.service.catalog.exception.ErrorCode;
import com.service.catalog.mapper.ProductDetailMapper;
import com.service.catalog.mapper.ProductMapper;
import com.service.catalog.repository.CategoryRepository;
import com.service.catalog.repository.ProductRepository;
import com.service.catalog.repository.ProductDetailRepository;
import com.service.catalog.repository.SizeRepository;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class ProductService {
    
    ProductRepository productRepository;
    CategoryRepository categoryRepository;
    SizeRepository sizeRepository;
    ProductMapper productMapper;
    ProductDetailRepository productDetailRepository;
    ProductDetailMapper productDetailMapper;
    
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ProductResponse createProduct(ProductCreationRequest request) {
        // Tạo Product entity
        Product product = new Product();
        product.setName(request.getName());
        product.setSku(request.getSku());
        product.setDescription(request.getDescription());
        product.setImageUrl(request.getImageUrl());
        product.setActive(true);
        product.setCreateAt(LocalDateTime.now());
        product.setUpdateAt(LocalDateTime.now());
        
        // Set category nếu có
        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));
            product.setCategory(category);
        }
        
        // Save product
        Product savedProduct = productRepository.save(product);
        
        // Tạo ProductDetail cho từng size
        if (request.getProductSizes() != null) {
            for (var productSizeRequest : request.getProductSizes()) {
                Size size = sizeRepository.findById(productSizeRequest.getSizeId())
                        .orElseThrow(() -> new AppException(ErrorCode.SIZE_NOT_FOUND));
                
                ProductDetail productDetail = ProductDetail.builder()
                        .product(savedProduct)
                        .size(size)
                        .price(productSizeRequest.getPrice())
                        .createAt(LocalDateTime.now())
                        .updateAt(LocalDateTime.now())
                        .build();
                
                savedProduct.getProductDetails().add(productDetail);
            }
            
            // Save lại product để cascade save các ProductDetail
            savedProduct = productRepository.save(savedProduct);
        }
        
        return productMapper.toProductResponse(savedProduct);
    }
    
    public List<ProductResponse> getAllProducts() {
        return productRepository.findAll()
                .stream()
                .map(productMapper::toProductResponse)
                .toList();
    }
    
    public ProductResponse getProductById(Integer productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND));
        return productMapper.toProductResponse(product);
    }

    public ProductDetailResponse getProductDetailById(Integer productDetailId) {
        ProductDetail productDetail = productDetailRepository.findById(productDetailId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_DETAIL_NOT_FOUND));
        return productDetailMapper.toProductDetailResponse(productDetail);
    }
}