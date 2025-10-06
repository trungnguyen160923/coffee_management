package com.service.catalog.controller;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.service.catalog.dto.ApiResponse;
import com.service.catalog.dto.request.recipe.RecipeCreationRequest;
import com.service.catalog.dto.request.recipe.RecipeUpdateRequest;
import com.service.catalog.dto.response.RecipeResponse;
import com.service.catalog.service.RecipeService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequestMapping("/recipes")
@RequiredArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class RecipeController {
    RecipeService recipeService;

    @GetMapping
    ApiResponse<List<RecipeResponse>> getAllRecipes() {
        return ApiResponse.<List<RecipeResponse>>builder().result(recipeService.getAllRecipes()).build();
    }

    @GetMapping("/search")
    ApiResponse<Page<RecipeResponse>> searchRecipes(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer pdId,
            @RequestParam(required = false) Integer productId,
            @RequestParam(required = false) Integer categoryId,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDir
    ) {
        return ApiResponse.<Page<RecipeResponse>>builder()
                .result(recipeService.searchRecipes(keyword, status, pdId, productId, categoryId, page, size, sortBy, sortDir))
                .build();
    }

    @PostMapping
    ApiResponse<RecipeResponse> createRecipe(@Valid @RequestBody RecipeCreationRequest request) {
        return ApiResponse.<RecipeResponse>builder().result(recipeService.createRecipe(request)).build();
    }

    @PutMapping("/{recipeId}")
    ApiResponse<RecipeResponse> updateRecipe(@PathVariable Integer recipeId, @Valid @RequestBody RecipeUpdateRequest request) {
        return ApiResponse.<RecipeResponse>builder().result(recipeService.updateRecipe(recipeId, request)).build();
    }

    @DeleteMapping("/{recipeId}")
    ApiResponse<Void> deleteRecipe(@PathVariable Integer recipeId) {
        recipeService.deleteRecipe(recipeId);
        return ApiResponse.<Void>builder().build();
    }

    @PostMapping("/{recipeId}/restore")
    ApiResponse<Void> restoreRecipe(@PathVariable Integer recipeId) {
        recipeService.restoreRecipe(recipeId);
        return ApiResponse.<Void>builder().build();
    }
    
    @GetMapping("/next-version")
    ApiResponse<Integer> getNextVersion(
            @RequestParam String name,
            @RequestParam Integer pdId) {
        Integer nextVersion = recipeService.getNextVersionForRecipe(name, pdId);
        return ApiResponse.<Integer>builder()
                .result(nextVersion)
                .build();
    }
}
