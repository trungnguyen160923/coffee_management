package com.service.auth.exception;

import com.service.auth.dto.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import jakarta.validation.constraints.Size;

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
                        if (errorCode.name().equals(message)) {
                            String formattedMessage = errorCode.getMessage();
                            
                            // Fill placeholders from validation metadata (Cách 2)
                            formattedMessage = fillConstraintPlaceholders(formattedMessage, ex, error);
                            
                            return formattedMessage;
                        }
                    }
                    
                    // Fallback to original message
                    return error.getField() + ": " + message;
                })
                .collect(Collectors.joining(", "));

        // Map specific validation to custom error code if needed (e.g., password size => 1004)
        org.springframework.validation.FieldError passwordSizeError = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .filter(err -> "password".equals(err.getField())
                        && ("Size".equals(err.getCode()) || "INVALID_PASSWORD".equals(err.getDefaultMessage())))
                .findFirst()
                .orElse(null);

        int responseCode = 4000;
        String responseMessage = errorMessage;

        if (passwordSizeError != null) {
            responseCode = ErrorCode.INVALID_PASSWORD.getCode();
            String filled = fillConstraintPlaceholders(ErrorCode.INVALID_PASSWORD.getMessage(), ex, passwordSizeError);
            responseMessage = filled;
        }

        ApiResponse<String> response = ApiResponse.<String>builder()
                .code(responseCode)
                .message(responseMessage)
                .build();

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }
    
    // Fill {min}/{max} placeholders using validation arguments or reflection on DTO field
    private String fillConstraintPlaceholders(String template, MethodArgumentNotValidException ex,
                                              org.springframework.validation.FieldError error) {
        String result = template;

        // Try to extract numeric args directly
        Integer minArg = extractMinFromArguments(error.getArguments());
        Integer maxArg = extractMaxFromArguments(error.getArguments());

        // If not found, try reflection to read @Size on the DTO field
        if (minArg == null || (maxArg == null || maxArg == Integer.MAX_VALUE)) {
            Integer[] sizeBounds = getSizeBoundsFromField(ex, error.getField());
            if (minArg == null && sizeBounds[0] != null) minArg = sizeBounds[0];
            if ((maxArg == null || maxArg == Integer.MAX_VALUE) && sizeBounds[1] != null) maxArg = sizeBounds[1];
        }

        if (minArg != null) {
            result = result.replace("{min}", String.valueOf(minArg));
        }
        if (maxArg != null && maxArg != Integer.MAX_VALUE) {
            result = result.replace("{max}", String.valueOf(maxArg));
        }

        // Fallback: try parse from resolved message if placeholders still remain
        if (result.contains("{min}") || result.contains("{max}")) {
            result = replacePlaceholders(result, error.getDefaultMessage());
        }

        return result;
    }

    private Integer extractMinFromArguments(Object[] args) {
        if (args == null) return null;
        Integer min = null;
        for (Object arg : args) {
            if (arg instanceof Number) {
                int v = ((Number) arg).intValue();
                if (v > 0 && v < Integer.MAX_VALUE) {
                    min = (min == null) ? v : Math.min(min, v);
                }
            }
        }
        return min;
    }

    private Integer extractMaxFromArguments(Object[] args) {
        if (args == null) return null;
        Integer max = null;
        for (Object arg : args) {
            if (arg instanceof Number) {
                int v = ((Number) arg).intValue();
                max = (max == null) ? v : Math.max(max, v);
            }
        }
        return max;
    }

    private Integer[] getSizeBoundsFromField(MethodArgumentNotValidException ex, String fieldName) {
        Integer[] bounds = new Integer[] { null, null };
        try {
            Object target = ex.getBindingResult().getTarget();
            if (target == null) return bounds;
            Class<?> clazz = target.getClass();
            java.lang.reflect.Field field = clazz.getDeclaredField(fieldName);
            Size size = field.getAnnotation(Size.class);
            if (size != null) {
                bounds[0] = size.min();
                bounds[1] = size.max();
            }
        } catch (NoSuchFieldException ignored) {
        }
        return bounds;
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