package com.service.catalog.dto.request.stock;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockSearchRequest {
    private String search;
    private Integer branchId;
    private Integer ingredientId;
    private String unitCode;
    private Boolean lowStock;
    private Integer page;
    private Integer size;
    private String sortBy;
    private String sortDirection;
}
