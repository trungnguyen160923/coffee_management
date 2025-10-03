package com.service.catalog.service;

import com.service.catalog.dto.request.product.ProductCreationRequest;
import com.service.catalog.dto.request.product.ProductSearchRequest;
import com.service.catalog.dto.request.product.ProductSizeRequest;
import com.service.catalog.dto.request.product.ProductUpdateRequest;
import com.service.catalog.dto.response.ProductDetailResponse;
import com.service.catalog.dto.response.ProductPageResponse;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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
        product.setActive(request.getActive() == null ? true : request.getActive());
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
                // Nếu sizeId = -1, coi như sản phẩm không thuộc nhóm đồ uống (Merchandise, Bánh ngọt, ...)
                // và KHÔNG cần lấy thông tin Size
                Size size = null;
                ProductDetail productDetail = null;
                if (productSizeRequest.getSizeId() != null && productSizeRequest.getSizeId() != -1) {
                    size = sizeRepository.findById(productSizeRequest.getSizeId())
                            .orElseThrow(() -> new AppException(ErrorCode.SIZE_NOT_FOUND));
                    productDetail = ProductDetail.builder()
                            .product(savedProduct)
                            .size(size)
                            .price(productSizeRequest.getPrice())
                            .createAt(LocalDateTime.now())
                            .updateAt(LocalDateTime.now())
                            .build();
                }
                else {
                    productDetail = ProductDetail.builder()
                            .product(savedProduct)
                            .price(productSizeRequest.getPrice())
                            .createAt(LocalDateTime.now())
                            .updateAt(LocalDateTime.now())
                            .build();
                }
                
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

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ProductResponse updateProduct(Integer productId, ProductUpdateRequest request) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND));

        if (request.getName() != null) product.setName(request.getName());
        if (request.getSku() != null) product.setSku(request.getSku());
        if (request.getDescription() != null) product.setDescription(request.getDescription());
        if (request.getImageUrl() != null) product.setImageUrl(request.getImageUrl());
        if (request.getActive() != null) product.setActive(request.getActive());

        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));
            product.setCategory(category);
        }

        product.setUpdateAt(LocalDateTime.now());

        // Update sizes: merge existing ProductDetails with request
        if (request.getProductSizes() != null) {
            // Validate mutual exclusivity: either no-size OR size list, not both
            boolean hasNoSize = request.getProductSizes().stream()
                .anyMatch(ps -> ps.getSizeId() == null || ps.getSizeId() == -1);
            boolean hasSizes = request.getProductSizes().stream()
                .anyMatch(ps -> ps.getSizeId() != null && ps.getSizeId() != -1);
            
            if (hasNoSize && hasSizes) {
                throw new AppException(ErrorCode.SIZE_NOT_FOUND, 
                    "Cannot have both no-size price and size-specific prices. Choose one approach.");
            }
            
            // Build lookup map of existing details by sizeId (or -1 for no-size)
            java.util.Map<Integer, ProductDetail> existingBySizeId = new java.util.HashMap<>();
            for (ProductDetail detail : product.getProductDetails()) {
                Integer sizeId = (detail.getSize() != null) ? detail.getSize().getSizeId() : -1;
                existingBySizeId.put(sizeId, detail);
            }

            java.util.Set<Integer> processedSizeIds = new java.util.HashSet<>();
            LocalDateTime now = LocalDateTime.now();

            // Process each size from request
            for (ProductSizeRequest productSizeRequest : request.getProductSizes()) {
                Integer sizeId = (productSizeRequest.getSizeId() != null && productSizeRequest.getSizeId() != -1) 
                    ? productSizeRequest.getSizeId() : -1;
                
                // Check for duplicate sizeId in request
                if (processedSizeIds.contains(sizeId)) {
                    throw new AppException(ErrorCode.SIZE_NOT_FOUND, "Duplicate sizeId in request: " + sizeId);
                }
                processedSizeIds.add(sizeId);

                ProductDetail existingDetail = existingBySizeId.get(sizeId);
                
                if (existingDetail != null) {
                    // Update existing detail
                    if (sizeId == -1) {
                        existingDetail.setSize(null);
                    } else {
                        Size size = sizeRepository.findById(sizeId)
                                .orElseThrow(() -> new AppException(ErrorCode.SIZE_NOT_FOUND));
                        existingDetail.setSize(size);
                    }
                    existingDetail.setPrice(productSizeRequest.getPrice());
                    existingDetail.setUpdateAt(now);
                } else {
                    // Create new detail
                    ProductDetail newDetail;
                    if (sizeId == -1) {
                        newDetail = ProductDetail.builder()
                                .product(product)
                                .price(productSizeRequest.getPrice())
                                .createAt(now)
                                .updateAt(now)
                                .build();
                    } else {
                        Size size = sizeRepository.findById(sizeId)
                                .orElseThrow(() -> new AppException(ErrorCode.SIZE_NOT_FOUND));
                        newDetail = ProductDetail.builder()
                                .product(product)
                                .size(size)
                                .price(productSizeRequest.getPrice())
                                .createAt(now)
                                .updateAt(now)
                                .build();
                    }
                    product.getProductDetails().add(newDetail);
                }
            }

            // Remove details that are no longer in the request
            product.getProductDetails().removeIf(detail -> {
                Integer sizeId = (detail.getSize() != null) ? detail.getSize().getSizeId() : -1;
                return !processedSizeIds.contains(sizeId);
            });
        }

        Product saved = productRepository.save(product);
        return productMapper.toProductResponse(saved);
    }

    public ProductDetailResponse getProductDetailById(Integer productDetailId) {
        ProductDetail productDetail = productDetailRepository.findById(productDetailId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_DETAIL_NOT_FOUND));
        return productDetailMapper.toProductDetailResponse(productDetail);
    }
    
    public ProductPageResponse searchProducts(ProductSearchRequest request) {
        // Tạo Pageable với sorting
        Sort sort = createSort(request.getSortBy(), request.getSortDirection());
        Pageable pageable = PageRequest.of(request.getPage(), request.getSize(), sort);
        
        // Gọi repository với filters
        Page<Product> productPage = productRepository.findProductsWithFilters(
                request.getSearch(),
                request.getCategoryId(),
                request.getActive(),
                pageable
        );
        
        // Convert sang ProductResponse
        List<ProductResponse> productResponses = productPage.getContent()
                .stream()
                .map(productMapper::toProductResponse)
                .toList();
        
        // Tạo response
        return ProductPageResponse.builder()
                .content(productResponses)
                .page(productPage.getNumber())
                .size(productPage.getSize())
                .totalElements(productPage.getTotalElements())
                .totalPages(productPage.getTotalPages())
                .first(productPage.isFirst())
                .last(productPage.isLast())
                .hasNext(productPage.hasNext())
                .hasPrevious(productPage.hasPrevious())
                .build();
    }
    
    private Sort createSort(String sortBy, String sortDirection) {
        if (sortBy == null || sortBy.isEmpty()) {
            sortBy = "createAt"; // Default sort by creation date
        }
        
        Sort.Direction direction = Sort.Direction.DESC; // Default descending
        if (sortDirection != null && !sortDirection.isEmpty()) {
            try {
                direction = Sort.Direction.fromString(sortDirection);
            } catch (Exception e) {
                // Keep default direction if invalid
            }
        }
        
        return Sort.by(direction, sortBy);
    }

    public void deleteProduct(Integer productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND));
        product.setActive(false);
        product.setUpdateAt(LocalDateTime.now());
        productRepository.save(product);
    }
}