package com.service.catalog.dto.request.recipe;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotNull;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RecipeItemCreationRequest {

    @NotNull(message = "EMPTY_INGREDIENT_ID")
    Integer ingredientId;
    
    @NotNull(message = "EMPTY_QTY")
    BigDecimal qty;
    @NotNull(message = "EMPTY_UNIT")
    String unitCode;

    String note;
}
