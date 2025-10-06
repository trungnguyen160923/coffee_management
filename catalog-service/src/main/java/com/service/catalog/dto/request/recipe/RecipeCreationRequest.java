package com.service.catalog.dto.request.recipe;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RecipeCreationRequest {
    @NotNull(message = "EMPTY_PD_ID")
    Integer pdId;

    @NotNull(message = "EMPTY_NAME")
    @Size(max = 150, message = "INVALID_NAME")
    String name;

    @NotNull(message = "EMPTY_VERSION")
    @Min(value = 1, message = "INVALID_VERSION")
    Integer version;
    
    @Size(max = 255, message = "INVALID_DESCRIPTION")
    String description;
    
    BigDecimal yield;
    
    @NotNull(message = "EMPTY_INSTRUCTIONS")
    String instructions;
    
    String status;

    @Valid
    @NotNull(message = "EMPTY_ITEMS")
    @Size(min = 1, message = "INVALID_ITEMS")
    List<RecipeItemCreationRequest> items;
}
