package com.service.catalog.controller;

import com.service.catalog.dto.ApiResponse;
import com.service.catalog.dto.response.CategoryResponse;
import com.service.catalog.service.CategoryService;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/categories")
@RequiredArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class CategoryController {

    CategoryService categoryService;

    @GetMapping
    public ApiResponse<List<CategoryResponse>> getAllCategories() {
        return ApiResponse.<List<CategoryResponse>>builder()
                .result(categoryService.getAllCategories())
                .build();
    }

    @GetMapping("/{categoryId}")
    public ApiResponse<CategoryResponse> getCategoryById(@PathVariable Integer categoryId) {
        return ApiResponse.<CategoryResponse>builder()
                .result(categoryService.getCategoryById(categoryId))
                .build();
    }
}
