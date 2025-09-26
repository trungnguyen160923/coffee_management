package com.service.auth.exception;

import com.service.auth.dto.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<String>> handleValidationException(MethodArgumentNotValidException ex) {
        log.error("Validation failed: {}", ex.getMessage());
        
        String errorMessage = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> {
                    String message = error.getDefaultMessage();
                    
                    // Try to find matching ErrorCode dynamically
                    for (ErrorCode errorCode : ErrorCode.values()) {
                        if (errorCode.getMessage().contains(message) || 
                            errorCode.name().equals(message)) {
                            return errorCode.getMessage();
                        }
                    }
                    
                    // Fallback to original message
                    return error.getField() + ": " + message;
                })
                .collect(Collectors.joining(", "));
        
        ApiResponse<String> response = ApiResponse.<String>builder()
                .code(4000)
                .message("Validation failed: " + errorMessage)
                .build();
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<String>> handleGenericException(Exception ex) {
        log.error("Unhandled exception occurred: {}", ex.getMessage(), ex);
        
        ApiResponse<String> response = ApiResponse.<String>builder()
                .code(9999)
                .message(ex.getMessage()) // Trả về message từ exception
                .build();
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponse<String>> handleAppException(AppException ex) {
        log.error("Application exception: {}", ex.getMessage(), ex);
        
        ApiResponse<String> response = ApiResponse.<String>builder()
                .code(ex.getErrorCode().getCode())
                .message(ex.getMessage())
                .build();
        
        return ResponseEntity.status(ex.getErrorCode().getStatusCode()).body(response);
    }
}