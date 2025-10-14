package com.service.catalog.mapper;

import com.service.catalog.dto.request.table.TableCreationRequest;
import com.service.catalog.dto.request.table.TableUpdateRequest;
import com.service.catalog.dto.response.TableResponse;
import com.service.catalog.entity.TableEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface TableMapper {

    @Mapping(target = "tableId", ignore = true)
    @Mapping(target = "createAt", ignore = true)
    @Mapping(target = "updateAt", ignore = true)
    @Mapping(target = "status", constant = "AVAILABLE")
    TableEntity toEntity(TableCreationRequest request);

    TableResponse toResponse(TableEntity table);

    @Mapping(target = "tableId", ignore = true)
    @Mapping(target = "branchId", ignore = true)
    @Mapping(target = "createAt", ignore = true)
    @Mapping(target = "updateAt", ignore = true)
    void updateEntity(TableUpdateRequest request, @MappingTarget TableEntity table);
}
