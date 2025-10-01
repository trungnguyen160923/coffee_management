package com.service.catalog.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

@Getter
public enum ErrorCode {
    UNCATEGORIZED_EXCEPTION(9999, "Uncategorized error", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_KEY(1001, "Uncategorized error", HttpStatus.BAD_REQUEST),
    UNAUTHENTICATED(1008, "Unauthenticated", HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED(1007, "You do not have permission", HttpStatus.FORBIDDEN),
    EMPTY_TOKEN(1010, "Token is required", HttpStatus.BAD_REQUEST),
    ACCESS_DENIED(1015, "Access denied", HttpStatus.FORBIDDEN),
    SIZE_ID_EXISTED(1023, "Size id existed", HttpStatus.BAD_REQUEST),
    EMPTY_NAME_SIZE(1024, "Name size is required", HttpStatus.BAD_REQUEST),
    INVALID_NAME_SIZE(1025, "Name size must be at most {max} characters", HttpStatus.BAD_REQUEST),
    EMPTY_DESCRIPTION(1026, "Description is required", HttpStatus.BAD_REQUEST),
    INVALID_DESCRIPTION(1027, "Description must be at most {max} characters", HttpStatus.BAD_REQUEST),
    SIZE_NAME_ALREADY_EXISTS(1028, "Name size is unique", HttpStatus.BAD_REQUEST),
    VALIDATION_FAILED(4000, "Validation failed", HttpStatus.BAD_REQUEST),
    EMPTY_NAME_PRODUCT(1029, "Name product is required", HttpStatus.BAD_REQUEST),
    INVALID_NAME_PRODUCT(1030, "Name product must be at most {max} characters", HttpStatus.BAD_REQUEST),
    EMPTY_CATEGORY_ID(1031, "Category id is required", HttpStatus.BAD_REQUEST),
    INVALID_SKU(1032, "SKU must be at most {max} characters", HttpStatus.BAD_REQUEST),
    INVALID_IMAGE_URL(1033, "Image url must be at most {max} characters", HttpStatus.BAD_REQUEST),
    EMPTY_SIZE_ID(1034, "Size id is required", HttpStatus.BAD_REQUEST),
    INVALID_PRICE(1035, "Price must be positive", HttpStatus.BAD_REQUEST),
    EMPTY_PRODUCT_SIZES(1036, "Product sizes are required", HttpStatus.BAD_REQUEST),
    EMPTY_PRICE(1037, "Price is required", HttpStatus.BAD_REQUEST),
    INVALID_PRODUCT_SIZES(1039, "Product sizes must be at least {min} items", HttpStatus.BAD_REQUEST),

    // Not Found errors (404)
    PRODUCT_NOT_FOUND(2001, "Product not found", HttpStatus.NOT_FOUND),
    CATEGORY_NOT_FOUND(2002, "Category not found", HttpStatus.NOT_FOUND),
    SIZE_NOT_FOUND(2003, "Size not found", HttpStatus.NOT_FOUND),
    PRODUCT_DETAIL_NOT_FOUND(2004, "Product detail not found", HttpStatus.NOT_FOUND),

    ;

    ErrorCode(int code, String message, HttpStatusCode statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }

    private final int code;
    private final String message;
    private final HttpStatusCode statusCode;

    public HttpStatus getHttpStatus() {
        return (HttpStatus) statusCode;
    }
}
