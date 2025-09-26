package com.service.auth.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.service.auth.dto.request.ManagerProfileCreationRequest;
import com.service.auth.dto.request.StaffProfileCreationRequest;
import com.service.auth.dto.request.UserCreationRequest;
import com.service.auth.dto.response.UserResponse;
import com.service.auth.entity.User;

@Mapper(componentModel = "spring")
public interface UserMapper {
    @Mapping(target = "role", ignore = true)
    User toUser(UserCreationRequest request);

    @Mapping(source = "userId", target = "user_id")
    UserResponse toUserCreationResponse(User user);
    
    @Mapping(target = "role", ignore = true)
    User toUser_Manager(ManagerProfileCreationRequest request);

    @Mapping(target = "role", ignore = true)
    User toUser_Staff(StaffProfileCreationRequest request);
}
