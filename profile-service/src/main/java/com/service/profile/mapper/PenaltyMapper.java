package com.service.profile.mapper;

import com.service.profile.dto.response.PenaltyResponse;
import com.service.profile.entity.Penalty;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface PenaltyMapper {
    
    @Mapping(target = "userRole", expression = "java(penalty.getUserRole().name())")
    @Mapping(target = "penaltyType", expression = "java(penalty.getPenaltyType().name())")
    @Mapping(target = "status", expression = "java(penalty.getStatus().name())")
    PenaltyResponse toPenaltyResponse(Penalty penalty);
}

