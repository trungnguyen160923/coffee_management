package com.service.catalog.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.service.catalog.dto.request.ingredient.IngredientCreationRequest;
import com.service.catalog.dto.request.ingredient.IngredientSearchRequest;
import com.service.catalog.dto.request.ingredient.IngredientUpdateRequest;
import com.service.catalog.dto.response.IngredientPageResponse;
import com.service.catalog.dto.response.IngredientResponse;
import com.service.catalog.entity.Ingredient;
import com.service.catalog.entity.Supplier;
import com.service.catalog.exception.AppException;
import com.service.catalog.exception.ErrorCode;
import com.service.catalog.mapper.IngredientMapper;
import com.service.catalog.repository.IngredientRepository;
import com.service.catalog.repository.SupplierRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class IngredientService {
    IngredientRepository ingredientRepository;
    IngredientMapper ingredientMapper;
    SupplierRepository supplierRepository;

    public List<IngredientResponse> getAllIngredients() {
        return ingredientRepository.findAll()
                .stream()
                .map(ingredientMapper::toIngredientResponse)
                .toList();
    }

    public IngredientResponse createIngredient(IngredientCreationRequest request) {
        Supplier supplier = supplierRepository.findById(request.getSupplierId())
        .orElseThrow(() -> new AppException(ErrorCode.SUPPLIER_NOT_FOUND));

        
        Ingredient ingredient = ingredientMapper.toIngredient(request);
        ingredient.setSupplier(supplier);
        ingredient.setCreateAt(LocalDateTime.now());
        ingredient.setUpdateAt(LocalDateTime.now());
        ingredientRepository.save(ingredient);
        return ingredientMapper.toIngredientResponse(ingredient);
    }

    public IngredientResponse updateIngredient(Integer ingredientId, IngredientUpdateRequest request) {
        Ingredient ingredient = ingredientRepository.findById(ingredientId)
                .orElseThrow(() -> new AppException(ErrorCode.INGREDIENT_NOT_FOUND));

        // Update supplier if provided
        if (request.getSupplierId() != null) {
            Supplier supplier = supplierRepository.findById(request.getSupplierId())
                    .orElseThrow(() -> new AppException(ErrorCode.SUPPLIER_NOT_FOUND));
            ingredient.setSupplier(supplier);
        }

        // Update other fields using MapStruct
        Ingredient updatedIngredient = ingredientMapper.toIngredient(request);
        
        // Manually update fields that need to be preserved
        if(updatedIngredient.getName() != null) {  
            ingredient.setName(updatedIngredient.getName());
        }
        if(updatedIngredient.getUnit() != null) {
            ingredient.setUnit(updatedIngredient.getUnit());
        }
        if(updatedIngredient.getUnitPrice() != null) {
            ingredient.setUnitPrice(updatedIngredient.getUnitPrice());
        }
        ingredient.setUpdateAt(LocalDateTime.now());
        
        ingredientRepository.save(ingredient);
        return ingredientMapper.toIngredientResponse(ingredient);
    }

    public void deleteIngredient(Integer ingredientId) {
        Ingredient ingredient = ingredientRepository.findById(ingredientId)
                .orElseThrow(() -> new AppException(ErrorCode.INGREDIENT_NOT_FOUND));
        ingredientRepository.delete(ingredient);
    }

    public IngredientPageResponse searchIngredients(IngredientSearchRequest request) {
        Sort sort = createSort(request.getSortBy(), request.getSortDirection());
        Pageable pageable = PageRequest.of(request.getPage(), request.getSize(), sort);

        Page<Ingredient> ingredientPage = ingredientRepository.findIngredientsWithFilters(
                request.getSearch(),
                request.getSupplierId(),
                pageable
        );

        List<IngredientResponse> responses = ingredientPage.getContent()
                .stream()
                .map(ingredientMapper::toIngredientResponse)
                .toList();

        return IngredientPageResponse.builder()
                .content(responses)
                .page(ingredientPage.getNumber())
                .size(ingredientPage.getSize())
                .totalElements(ingredientPage.getTotalElements())
                .totalPages(ingredientPage.getTotalPages())
                .first(ingredientPage.isFirst())
                .last(ingredientPage.isLast())
                .hasNext(ingredientPage.hasNext())
                .hasPrevious(ingredientPage.hasPrevious())
                .build();
    }

    private Sort createSort(String sortBy, String sortDirection) {
        if (sortBy == null || sortBy.isEmpty()) {
            sortBy = "createAt";
        }

        Sort.Direction direction = Sort.Direction.ASC;
        if (sortDirection != null && sortDirection.equalsIgnoreCase("DESC")) {
            direction = Sort.Direction.DESC;
        }

        return Sort.by(direction, sortBy);
    }
}
