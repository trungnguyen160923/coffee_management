package com.service.catalog.dto.request.recipe;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.List;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RecipeUpdateRequest {
    Integer pdId;

    @Size(max = 150, message = "INVALID_NAME")
    String name;

    @Min(value = 1, message = "INVALID_VERSION")
    Integer version;
    
    @Size(max = 255, message = "INVALID_DESCRIPTION")
    String description;
    
    BigDecimal yield;
    
    String instructions;
    
    String status;

    List<RecipeItemUpsertRequest> items;
}
