package com.service.auth.mapper;

import com.service.auth.dto.response.RoleResponse;
import com.service.auth.entity.Role;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface RoleMapper {
    RoleResponse toRoleResponse(Role role);
}
