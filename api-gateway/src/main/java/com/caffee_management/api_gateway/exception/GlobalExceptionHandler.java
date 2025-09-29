package com.caffee_management.api_gateway.exception;

import com.caffee_management.api_gateway.dto.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {
    
    @Autowired
    private MessageSource messageSource;

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
                        if (errorCode.name().equals(message)) {
                            String formattedMessage = errorCode.getMessage();
                            
                            // Try to extract values from the default message directly
                            log.debug("Error code: {}, Default message: {}", error.getCode(), error.getDefaultMessage());
                            log.debug("Arguments: {}", java.util.Arrays.toString(error.getArguments()));
                            
                            // Extract actual values from arguments
                            Object[] args = error.getArguments();
                            if (args != null && args.length > 0) {
                                // Find numeric values in arguments
                                for (Object arg : args) {
                                    if (arg instanceof Number) {
                                        Number num = (Number) arg;
                                        if (num.intValue() == 1) { // min value
                                            formattedMessage = formattedMessage.replace("{min}", "1");
                                        } else if (num.intValue() == 2147483647) { // max value
                                            formattedMessage = formattedMessage.replace("{max}", "2147483647");
                                        }
                                    }
                                }
                            }
                            
                            // Fallback: try to extract from default message
                            if (formattedMessage.contains("{min}") || formattedMessage.contains("{max}")) {
                                formattedMessage = replacePlaceholders(formattedMessage, error.getDefaultMessage());
                            }
                            
                            return formattedMessage;
                        }
                    }
                    
                    // Fallback to original message
                    return error.getField() + ": " + message;
                })
                .collect(Collectors.joining(", "));
        
        ApiResponse<String> response = ApiResponse.<String>builder()
                .code(4000)
                .message(errorMessage)
                .build();
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }
    
    private String replacePlaceholders(String template, String resolvedMessage) {
        String result = template;
        
        log.debug("Template: {}, Resolved: {}", template, resolvedMessage);
        
        // Extract values from resolved message and replace placeholders
        if (resolvedMessage.contains("must be at least")) {
            try {
                String minValue = resolvedMessage.split("must be at least ")[1].split(" ")[0];
                result = result.replace("{min}", minValue);
                log.debug("Replaced {min} with: {}", minValue);
            } catch (Exception e) {
                log.debug("Could not extract min value from: {}", resolvedMessage);
            }
        }
        
        if (resolvedMessage.contains("must be at most")) {
            try {
                String maxValue = resolvedMessage.split("must be at most ")[1].split(" ")[0];
                result = result.replace("{max}", maxValue);
                log.debug("Replaced {max} with: {}", maxValue);
            } catch (Exception e) {
                log.debug("Could not extract max value from: {}", resolvedMessage);
            }
        }
        
        if (resolvedMessage.contains("must be between")) {
            try {
                String[] parts = resolvedMessage.split("must be between ")[1].split(" and ");
                if (parts.length >= 2) {
                    String minValue = parts[0].trim();
                    String maxValue = parts[1].trim();
                    result = result.replace("{min}", minValue);
                    result = result.replace("{max}", maxValue);
                    log.debug("Replaced {min} with: {}, {max} with: {}", minValue, maxValue);
                }
            } catch (Exception e) {
                log.debug("Could not extract min/max values from: {}", resolvedMessage);
            }
        }
        
        log.debug("Final result: {}", result);
        return result;
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<String>> handleDataIntegrityViolationException(DataIntegrityViolationException ex) {
        log.error("Data integrity violation: {}", ex.getMessage(), ex);
        
        // Check if it's a duplicate key constraint for size name
        if (ex.getMessage().contains("uq_size_name")) {
            ApiResponse<String> response = ApiResponse.<String>builder()
                    .code(1028)
                    .message("Name size is unique")
                    .build();
            
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
        
        // Handle other data integrity violations
        ApiResponse<String> response = ApiResponse.<String>builder()
                .code(9999)
                .message("Data integrity violation: " + ex.getMessage())
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