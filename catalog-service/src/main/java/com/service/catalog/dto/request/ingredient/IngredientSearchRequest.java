package com.service.catalog.dto.request.ingredient;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IngredientSearchRequest {

    private Integer page;

    private Integer size;

    private String search;

    private Integer supplierId;

    private String sortBy;

    private String sortDirection;
}


