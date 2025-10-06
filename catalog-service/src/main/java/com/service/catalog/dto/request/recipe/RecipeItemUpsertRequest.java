package com.service.catalog.dto.request.recipe;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RecipeItemUpsertRequest {
    Integer id; // null => create new; not null => update existing

    @NotNull(message = "EMPTY_INGREDIENT_ID")
    Integer ingredientId;

    @NotNull(message = "EMPTY_QTY")
    BigDecimal qty;

    @NotNull(message = "EMPTY_UNIT")
    String unitCode;

    String note;
}


