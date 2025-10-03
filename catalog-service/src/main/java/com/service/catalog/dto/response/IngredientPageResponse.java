package com.service.catalog.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IngredientPageResponse {
    
    private List<IngredientResponse> content;
    
    private Integer page;
    
    private Integer size;
    
    private Long totalElements;
    
    private Integer totalPages;
    
    private Boolean first;
    
    private Boolean last;
    
    private Boolean hasNext;
    
    private Boolean hasPrevious;
}


