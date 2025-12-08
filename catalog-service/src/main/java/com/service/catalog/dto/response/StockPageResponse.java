package com.service.catalog.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockPageResponse {
    private List<StockResponse> content;
    private Long totalElements;
    private Integer totalPages;
    private Integer size;
    private Integer number;
    private Boolean first;
    private Boolean last;
    private Integer numberOfElements;
    private Boolean empty;
    private BigDecimal totalStockValue; // Total stock value for all matching stocks (not just current page)
}

