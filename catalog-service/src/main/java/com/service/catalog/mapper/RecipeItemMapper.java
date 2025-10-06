package com.service.catalog.mapper;

import org.mapstruct.Mapper;

import com.service.catalog.dto.request.recipe.RecipeItemCreationRequest;
import com.service.catalog.dto.response.RecipeItemResponse;
import com.service.catalog.entity.RecipeItem;

@Mapper(componentModel = "spring", uses = {IngredientMapper.class, UnitMapper.class})
public interface RecipeItemMapper {
    RecipeItemResponse toRecipeItemResponse(RecipeItem recipeItem);
    RecipeItem toRecipeItem(RecipeItemCreationRequest request);
}
