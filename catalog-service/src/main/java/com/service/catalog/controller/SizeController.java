package com.service.catalog.controller;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.service.catalog.dto.ApiResponse;
import com.service.catalog.dto.request.SizeCreationRequest;
import com.service.catalog.dto.response.SizeResponse;
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
    ApiResponse<SizeResponse> createSize(@Valid @RequestBody SizeCreationRequest request) {
        SizeResponse result = sizeService.createSize(request);
        return ApiResponse.<SizeResponse>builder().result(result).build();
    }

    @GetMapping
    ApiResponse<List<SizeResponse>> getAllSizes() {
        return ApiResponse.<List<SizeResponse>>builder().result(sizeService.getAllSizes()).build();
    }
}
