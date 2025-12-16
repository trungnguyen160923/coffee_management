package com.service.profile.mapper;

import com.service.profile.dto.request.BonusTemplateCreationRequest;
import com.service.profile.dto.request.BonusTemplateUpdateRequest;
import com.service.profile.dto.response.BonusTemplateResponse;
import com.service.profile.entity.BonusTemplate;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface BonusTemplateMapper {

    @Mapping(target = "templateId", ignore = true)
    @Mapping(target = "createAt", ignore = true)
    @Mapping(target = "updateAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "isActive", constant = "true")
    @Mapping(target = "bonusType", expression = "java(com.service.profile.entity.BonusTemplate.BonusType.valueOf(request.getBonusType()))")
    BonusTemplate toEntity(BonusTemplateCreationRequest request);

    @Mapping(target = "scope", expression = "java(template.getScope())")
    BonusTemplateResponse toResponse(BonusTemplate template);

    @Mapping(target = "templateId", ignore = true)
    @Mapping(target = "branchId", ignore = true)
    @Mapping(target = "createAt", ignore = true)
    @Mapping(target = "updateAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "bonusType", expression = "java(request.getBonusType() != null ? com.service.profile.entity.BonusTemplate.BonusType.valueOf(request.getBonusType()) : null)")
    void updateEntity(@MappingTarget BonusTemplate entity, BonusTemplateUpdateRequest request);
}

