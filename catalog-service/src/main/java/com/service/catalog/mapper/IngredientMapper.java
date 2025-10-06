package com.service.catalog.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import com.service.catalog.dto.request.ingredient.IngredientCreationRequest;
import com.service.catalog.dto.request.ingredient.IngredientUpdateRequest;
import com.service.catalog.dto.response.IngredientResponse;
import com.service.catalog.entity.Ingredient;
import com.service.catalog.entity.Unit;

@Mapper(componentModel = "spring", uses = {SupplierMapper.class, UnitMapper.class})
public interface IngredientMapper {
    
    @Mapping(target = "unit", source = "unitCode", qualifiedByName = "unitCodeToUnit")
    Ingredient toIngredient(IngredientCreationRequest request);
    
    @Mapping(target = "unit", source = "ingredient.unit")
    IngredientResponse toIngredientResponse(Ingredient ingredient);
    
    @Mapping(target = "unit", source = "unitCode", qualifiedByName = "unitCodeToUnit")
    Ingredient toIngredient(IngredientUpdateRequest request);
    
    @Named("unitCodeToUnit")
    default Unit unitCodeToUnit(String unitCode) {
        if (unitCode == null) return null;
        return Unit.builder().code(unitCode).build();
    }
}
