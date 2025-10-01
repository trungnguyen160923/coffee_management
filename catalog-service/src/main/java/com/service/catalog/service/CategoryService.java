package com.service.catalog.service;

import com.service.catalog.dto.response.CategoryResponse;
import com.service.catalog.entity.Category;
import com.service.catalog.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class CategoryService {

    CategoryRepository categoryRepository;

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
                .createAt(category.getCreateAt())
                .updateAt(category.getUpdateAt())
                .build();
    }
}
