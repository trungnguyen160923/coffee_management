package com.service.auth.mapper;

import com.service.auth.dto.response.RoleResponse;
import com.service.auth.entity.Role;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface RoleMapper {
    @Mapping(source = "roleId", target = "roleId")
    @Mapping(source = "name", target = "name")
    RoleResponse toRoleResponse(Role role);
}
