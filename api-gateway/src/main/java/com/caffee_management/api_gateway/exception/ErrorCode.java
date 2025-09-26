package com.caffee_management.api_gateway.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

@Getter
public enum ErrorCode {
    UNCATEGORIZED_EXCEPTION(9999, "Uncategorized error", HttpStatus.INTERNAL_SERVER_ERROR),
    SERVICE_UNAVAILABLE(1001, "Service is not available", HttpStatus.SERVICE_UNAVAILABLE),
    GATEWAY_ERROR(1002, "Gateway error", HttpStatus.BAD_GATEWAY),
    TIMEOUT_ERROR(1003, "Request timeout", HttpStatus.REQUEST_TIMEOUT),
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
