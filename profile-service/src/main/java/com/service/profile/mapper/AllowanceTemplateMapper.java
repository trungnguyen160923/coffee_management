package com.service.profile.mapper;

import com.service.profile.dto.request.AllowanceTemplateCreationRequest;
import com.service.profile.dto.request.AllowanceTemplateUpdateRequest;
import com.service.profile.dto.response.AllowanceTemplateResponse;
import com.service.profile.entity.AllowanceTemplate;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface AllowanceTemplateMapper {

    @Mapping(target = "templateId", ignore = true)
    @Mapping(target = "createAt", ignore = true)
    @Mapping(target = "updateAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "isActive", constant = "true")
    @Mapping(target = "allowanceType", expression = "java(com.service.profile.entity.AllowanceTemplate.AllowanceType.valueOf(request.getAllowanceType()))")
    AllowanceTemplate toEntity(AllowanceTemplateCreationRequest request);

    @Mapping(target = "scope", expression = "java(template.getScope())")
    AllowanceTemplateResponse toResponse(AllowanceTemplate template);

    @Mapping(target = "templateId", ignore = true)
    @Mapping(target = "branchId", ignore = true)
    @Mapping(target = "createAt", ignore = true)
    @Mapping(target = "updateAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "allowanceType", expression = "java(request.getAllowanceType() != null ? com.service.profile.entity.AllowanceTemplate.AllowanceType.valueOf(request.getAllowanceType()) : null)")
    void updateEntity(@MappingTarget AllowanceTemplate entity, AllowanceTemplateUpdateRequest request);
}

