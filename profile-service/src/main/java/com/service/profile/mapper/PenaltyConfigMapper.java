package com.service.profile.mapper;

import com.service.profile.dto.request.PenaltyConfigCreationRequest;
import com.service.profile.dto.request.PenaltyConfigUpdateRequest;
import com.service.profile.dto.response.PenaltyConfigResponse;
import com.service.profile.entity.PenaltyConfig;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface PenaltyConfigMapper {

    @Mapping(target = "configId", ignore = true)
    @Mapping(target = "createAt", ignore = true)
    @Mapping(target = "updateAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "isActive", constant = "true")
    PenaltyConfig toEntity(PenaltyConfigCreationRequest request);

    @Mapping(target = "scope", expression = "java(config.getScope())")
    PenaltyConfigResponse toResponse(PenaltyConfig config);

    @Mapping(target = "configId", ignore = true)
    @Mapping(target = "branchId", ignore = true)
    @Mapping(target = "createAt", ignore = true)
    @Mapping(target = "updateAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    void updateEntity(@MappingTarget PenaltyConfig entity, PenaltyConfigUpdateRequest request);
}

