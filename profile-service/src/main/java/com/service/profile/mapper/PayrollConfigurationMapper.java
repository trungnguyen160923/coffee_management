package com.service.profile.mapper;

import com.service.profile.dto.request.PayrollConfigurationUpdateRequest;
import com.service.profile.dto.response.PayrollConfigurationResponse;
import com.service.profile.entity.PayrollConfiguration;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface PayrollConfigurationMapper {

    PayrollConfigurationResponse toResponse(PayrollConfiguration config);

    @Mapping(target = "configId", ignore = true)
    @Mapping(target = "configKey", ignore = true)
    @Mapping(target = "configType", ignore = true)
    @Mapping(target = "displayName", ignore = true)
    @Mapping(target = "unit", ignore = true)
    @Mapping(target = "createAt", ignore = true)
    @Mapping(target = "updateAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateEntity(@MappingTarget PayrollConfiguration entity, PayrollConfigurationUpdateRequest request);
}

