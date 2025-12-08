package com.service.catalog.service;

import com.service.catalog.dto.request.category.CategoryCreationRequest;
import com.service.catalog.dto.request.category.CategoryUpdateRequest;
import com.service.catalog.dto.response.CategoryResponse;
import com.service.catalog.entity.Category;
import com.service.catalog.exception.AppException;
import com.service.catalog.exception.ErrorCode;
import com.service.catalog.mapper.CategoryMapper;
import com.service.catalog.repository.CategoryRepository;
import com.service.catalog.repository.ProductRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class CategoryService {

    CategoryRepository categoryRepository;
    ProductRepository productRepository;
    CategoryMapper categoryMapper;

    public List<CategoryResponse> getAllCategories() {
        return categoryRepository.findAll()
                .stream()
                .map(this::toCategoryResponse)
                .toList();
    }

    public CategoryResponse getCategoryById(Integer categoryId) {
        Category category = categoryRepository.findById(categoryId)
                .orElse(null);
        return toCategoryResponse(category);
    }

    private CategoryResponse toCategoryResponse(Category category) {
        if (category == null)
            return null;
        return CategoryResponse.builder()
                .categoryId(category.getCategoryId())
                .name(category.getName())
                .description(category.getDescription())
                .active(true) // Default to true if entity doesn't have active field
                .createAt(category.getCreateAt())
                .updateAt(category.getUpdateAt())
                .build();
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public CategoryResponse createCategory(CategoryCreationRequest request) {
        Category category = categoryMapper.toCategory(request);
        category.setCreateAt(LocalDateTime.now());
        category.setUpdateAt(LocalDateTime.now());
        categoryRepository.save(category);
        return toCategoryResponse(category);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public CategoryResponse updateCategory(Integer categoryId, CategoryUpdateRequest request) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));
        category.setName(request.getName());
        category.setDescription(request.getDescription());
        category.setUpdateAt(LocalDateTime.now());
        categoryRepository.save(category);
        return toCategoryResponse(category);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteCategory(Integer categoryId) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));
        if (productRepository.existsByCategoryCategoryId(categoryId)) {
            throw new AppException(ErrorCode.CATEGORY_IN_USE);
        }
        categoryRepository.deleteById(categoryId);
    }
}
