package com.service.catalog.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import com.service.catalog.dto.request.unit.UnitCreationRequest;
import com.service.catalog.dto.request.unit.UnitUpdateRequest;
import com.service.catalog.dto.response.UnitResponse;
import com.service.catalog.entity.Unit;

@Mapper(componentModel = "spring")
public interface UnitMapper {
    
    @Mapping(target = "baseUnitCode", source = "unit", qualifiedByName = "toBaseUnitCode")
    UnitResponse toUnitResponse(Unit unit);
    
    @Mapping(target = "baseUnit", ignore = true) // Tránh vòng lặp vô hạn
    @Mapping(target = "derivedUnits", ignore = true)
    @Mapping(target = "ingredients", ignore = true)
    @Mapping(target = "purchaseOrderDetails", ignore = true)
    @Mapping(target = "recipeItems", ignore = true)
    @Mapping(target = "stocks", ignore = true)
    Unit toUnit(UnitResponse response);

    @Mapping(target = "baseUnit", source = "baseUnitCode", qualifiedByName = "baseUnitCodeToUnit")
    @Mapping(target = "derivedUnits", ignore = true)
    @Mapping(target = "ingredients", ignore = true)
    @Mapping(target = "purchaseOrderDetails", ignore = true)
    @Mapping(target = "recipeItems", ignore = true)
    @Mapping(target = "stocks", ignore = true)
    @Mapping(target = "createAt", ignore = true)
    @Mapping(target = "updateAt", ignore = true)
    Unit toUnit(UnitCreationRequest request);

    @Mapping(target = "baseUnit", source = "baseUnitCode", qualifiedByName = "baseUnitCodeToUnit")
    @Mapping(target = "derivedUnits", ignore = true)
    @Mapping(target = "ingredients", ignore = true)
    @Mapping(target = "purchaseOrderDetails", ignore = true)
    @Mapping(target = "recipeItems", ignore = true)
    @Mapping(target = "stocks", ignore = true)
    @Mapping(target = "code", ignore = true)
    @Mapping(target = "createAt", ignore = true)
    @Mapping(target = "updateAt", ignore = true)
    Unit toUnit(UnitUpdateRequest request);
    
    @Named("baseUnitCodeToUnit")
    default Unit baseUnitCodeToUnit(String baseUnitCode) {
        if (baseUnitCode == null) return null;
        // Chỉ tạo Unit object với code, không cần load từ database
        // Hibernate sẽ tự động xử lý foreign key constraint
        return Unit.builder().code(baseUnitCode).build();
    }

    @Named("toBaseUnitCode")
    default String toBaseUnitCode(Unit unit) {
        if (unit == null) return null;
        if (unit.getBaseUnit() != null && unit.getBaseUnit().getCode() != null) {
            return unit.getBaseUnit().getCode();
        }
        // Fallback for self-referencing base units where baseUnit may not be initialized
        return unit.getCode();
    }
}
