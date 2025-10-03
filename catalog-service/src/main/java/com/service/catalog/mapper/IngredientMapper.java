package com.service.catalog.mapper;

import org.mapstruct.Mapper;

import com.service.catalog.dto.request.ingredient.IngredientCreationRequest;
import com.service.catalog.dto.request.ingredient.IngredientUpdateRequest;
import com.service.catalog.dto.response.IngredientResponse;
import com.service.catalog.entity.Ingredient;

@Mapper(componentModel = "spring", uses = SupplierMapper.class)
public interface IngredientMapper {
    Ingredient toIngredient(IngredientCreationRequest request);
    IngredientResponse toIngredientResponse(Ingredient ingredient);
    Ingredient toIngredient(IngredientUpdateRequest request);
}
