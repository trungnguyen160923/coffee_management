package com.service.profile.mapper;

import com.service.profile.dto.response.BonusResponse;
import com.service.profile.entity.Bonus;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface BonusMapper {
    
    @Mapping(target = "userRole", expression = "java(bonus.getUserRole().name())")
    @Mapping(target = "bonusType", expression = "java(bonus.getBonusType().name())")
    @Mapping(target = "status", expression = "java(bonus.getStatus().name())")
    BonusResponse toBonusResponse(Bonus bonus);
}

