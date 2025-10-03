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
import org.springframework.web.bind.annotation.RequestParam;

import com.service.catalog.dto.ApiResponse;
import com.service.catalog.dto.request.ingredient.IngredientCreationRequest;
import com.service.catalog.dto.request.ingredient.IngredientUpdateRequest;
import com.service.catalog.dto.request.ingredient.IngredientSearchRequest;
import com.service.catalog.dto.response.IngredientResponse;
import com.service.catalog.dto.response.IngredientPageResponse;
import com.service.catalog.service.IngredientService;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/ingredients")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class IngredientController {
    IngredientService ingredientService;

    @GetMapping
    ApiResponse<List<IngredientResponse>> getAllIngredients() {
        return ApiResponse.<List<IngredientResponse>>builder().result(ingredientService.getAllIngredients()).build();
    }

    @PostMapping
    ApiResponse<IngredientResponse> createIngredient(@Valid @RequestBody IngredientCreationRequest request) {
        return ApiResponse.<IngredientResponse>builder().result(ingredientService.createIngredient(request)).build();
    }

    @PutMapping("/{ingredientId}")
    ApiResponse<IngredientResponse> updateIngredient(@PathVariable Integer ingredientId,
            @Valid @RequestBody IngredientUpdateRequest request) {
        return ApiResponse.<IngredientResponse>builder().result(ingredientService.updateIngredient(ingredientId, request)).build();
    }

    @GetMapping("/search")
    ApiResponse<IngredientPageResponse> searchIngredients(
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer supplierId,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDirection) {

        IngredientSearchRequest request = IngredientSearchRequest.builder()
                .page(page)
                .size(size)
                .search(search)
                .supplierId(supplierId)
                .sortBy(sortBy)
                .sortDirection(sortDirection)
                .build();

        IngredientPageResponse result = ingredientService.searchIngredients(request);
        return ApiResponse.<IngredientPageResponse>builder().result(result).build();
    }

    @DeleteMapping("/{ingredientId}")
    ApiResponse<Void> deleteIngredient(@PathVariable Integer ingredientId) {
        ingredientService.deleteIngredient(ingredientId);
        return ApiResponse.<Void>builder().build();
    }
}
