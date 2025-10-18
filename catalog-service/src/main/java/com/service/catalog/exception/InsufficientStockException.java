package com.service.catalog.exception;

import com.service.catalog.dto.response.stock.InsufficientStockResponse;
import lombok.Getter;

import java.util.List;

@Getter
public class InsufficientStockException extends RuntimeException {
    private final InsufficientStockResponse insufficientStockResponse;
    private final List<InsufficientStockResponse.InsufficientIngredient> errors;

    public InsufficientStockException(InsufficientStockResponse insufficientStockResponse) {
        super("Insufficient stock for the requested items");
        this.insufficientStockResponse = insufficientStockResponse;
        this.errors = insufficientStockResponse.getInsufficientIngredients();
    }

    public InsufficientStockException(String message, InsufficientStockResponse insufficientStockResponse) {
        super(message);
        this.insufficientStockResponse = insufficientStockResponse;
        this.errors = insufficientStockResponse.getInsufficientIngredients();
    }
    
    public InsufficientStockException(String message, List<InsufficientStockResponse.InsufficientIngredient> errors) {
        super(message);
        this.insufficientStockResponse = null;
        this.errors = errors;
    }
}
