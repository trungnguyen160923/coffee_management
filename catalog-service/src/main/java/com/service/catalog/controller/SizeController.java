package com.service.catalog.controller;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.service.catalog.dto.ApiResponse;
import com.service.catalog.dto.request.SizeCreationRequest;
import com.service.catalog.dto.request.SizeUpdateRequest;
import com.service.catalog.dto.response.SizeResponse;
import com.service.catalog.exception.AppException;
import com.service.catalog.service.SizeService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/sizes")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class SizeController {
    SizeService sizeService;

    @PostMapping
    ResponseEntity<ApiResponse<SizeResponse>> createSize(@Valid @RequestBody SizeCreationRequest request) {
        try {
            SizeResponse result = sizeService.createSize(request);
            return ResponseEntity.ok(ApiResponse.<SizeResponse>builder().result(result).build());
        } catch (AppException e) {
            log.error("Error creating size: {}", e.getMessage());
            return ResponseEntity.status(e.getErrorCode().getHttpStatus())
                .body(ApiResponse.<SizeResponse>builder()
                    .code(e.getErrorCode().getCode())
                    .message(e.getMessage())
                    .build());
        } catch (Exception e) {
            log.error("Unexpected error creating size", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.<SizeResponse>builder()
                    .code(500)
                    .message("Internal server error")
                    .build());
        }
    }

    @GetMapping
    ApiResponse<List<SizeResponse>> getAllSizes() {
        return ApiResponse.<List<SizeResponse>>builder().result(sizeService.getAllSizes()).build();
    }

    @PutMapping("/{sizeId}")
    ResponseEntity<ApiResponse<SizeResponse>> updateSize(@PathVariable Integer sizeId, @Valid @RequestBody SizeUpdateRequest request) {
        try {
            SizeResponse result = sizeService.updateSize(sizeId, request);
            return ResponseEntity.ok(ApiResponse.<SizeResponse>builder().result(result).build());
        } catch (AppException e) {
            log.error("Error updating size: {}", e.getMessage());
            return ResponseEntity.status(e.getErrorCode().getHttpStatus())
                .body(ApiResponse.<SizeResponse>builder()
                    .code(e.getErrorCode().getCode())
                    .message(e.getMessage())
                    .build());
        } catch (Exception e) {
            log.error("Unexpected error updating size", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.<SizeResponse>builder()
                    .code(500)
                    .message("Internal server error")
                    .build());
        }
    }

    @DeleteMapping("/{sizeId}")
    ResponseEntity<ApiResponse<Void>> deleteSize(@PathVariable Integer sizeId) {
        try {
            sizeService.deleteSize(sizeId);
            return ResponseEntity.ok(ApiResponse.<Void>builder()
                .code(1000)
                .message("Size deleted successfully")
                .build());
        } catch (AppException e) {
            log.error("Error deleting size: {}", e.getMessage());
            return ResponseEntity.status(e.getErrorCode().getHttpStatus())
                .body(ApiResponse.<Void>builder()
                    .code(e.getErrorCode().getCode())
                    .message(e.getMessage())
                    .build());
        } catch (Exception e) {
            log.error("Unexpected error deleting size", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.<Void>builder()
                    .code(500)
                    .message("Internal server error")
                    .build());
        }
    }
}
