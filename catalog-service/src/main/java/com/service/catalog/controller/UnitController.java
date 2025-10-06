package com.service.catalog.controller;

import java.util.List;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.service.catalog.dto.ApiResponse;
import com.service.catalog.dto.request.unit.UnitCreationRequest;
import com.service.catalog.dto.request.unit.UnitUpdateRequest;
import com.service.catalog.dto.response.UnitResponse;
import com.service.catalog.service.UnitService;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/units")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class UnitController {
    UnitService unitService;

    @GetMapping
    ApiResponse<List<UnitResponse>> getAllUnits() {
        return ApiResponse.<List<UnitResponse>>builder().result(unitService.getAllUnits()).build();
    }

    @PostMapping
    ApiResponse<UnitResponse> createUnit(@Valid @RequestBody UnitCreationRequest request) {
        return ApiResponse.<UnitResponse>builder().result(unitService.createUnit(request)).build();
    }

    @PutMapping("/{unitCode}")
    ApiResponse<UnitResponse> updateUnit(@PathVariable String unitCode, @Valid @RequestBody UnitUpdateRequest request) {
        return ApiResponse.<UnitResponse>builder().result(unitService.updateUnit(unitCode, request)).build();
    }

    @DeleteMapping("/{unitCode}")
    ApiResponse<Void> deleteUnit(@PathVariable String unitCode) {
        unitService.deleteUnit(unitCode);
        return ApiResponse.<Void>builder().build();
    }
    
}
