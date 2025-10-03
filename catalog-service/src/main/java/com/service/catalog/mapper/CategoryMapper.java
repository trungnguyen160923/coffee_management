package com.service.catalog.mapper;


import org.mapstruct.Mapper;

import com.service.catalog.dto.request.category.CategoryCreationRequest;
import com.service.catalog.dto.request.category.CategoryUpdateRequest;
import com.service.catalog.dto.response.CategoryResponse;
import com.service.catalog.entity.Category;

@Mapper(componentModel = "spring")
public interface CategoryMapper {
    Category toCategory(CategoryCreationRequest request);
    CategoryResponse toCategoryResponse(Category category);
    Category toCategory(CategoryUpdateRequest request);
    
}
