package com.service.catalog.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import lombok.AccessLevel;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RecipeItemResponse {
    Integer id;
    IngredientResponse ingredient;
    BigDecimal qty;
    UnitResponse unit;
    String note;
    LocalDateTime createAt;
    LocalDateTime updateAt;
}
