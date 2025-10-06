package com.service.catalog.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.AccessLevel;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RecipeResponse {
    Integer recipeId;
    String name;
    ProductDetailResponse productDetail;
    CategoryResponse category;
    Integer version;
    String description;
    BigDecimal yield;
    String instructions;
    String status;
    List<RecipeItemResponse> items;
    LocalDateTime createAt;
    LocalDateTime updateAt;
}
