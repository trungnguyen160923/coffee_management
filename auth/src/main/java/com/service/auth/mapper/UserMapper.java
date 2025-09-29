package com.service.auth.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.service.auth.dto.request.ManagerProfileCreationRequest;
import com.service.auth.dto.request.StaffProfileCreationRequest;
import com.service.auth.dto.request.UserCreationRequest;
import com.service.auth.dto.response.ManagerProfileResponse;
import com.service.auth.dto.response.StaffProfileResponse;
import com.service.auth.dto.response.UserResponse;
import com.service.auth.entity.User;

@Mapper(componentModel = "spring")
public interface UserMapper {
    @Mapping(target = "role", ignore = true)
    User toUser(UserCreationRequest request);

    @Mapping(source = "userId", target = "user_id")
    UserResponse toUserResponse(User user);
    
    @Mapping(target = "role", ignore = true)
    User toUser_Manager(ManagerProfileCreationRequest request);

    @Mapping(target = "role", ignore = true)
    User toUser_Staff(StaffProfileCreationRequest request);

    @Mapping(target = "role", ignore = true)
    UserResponse toUserResponse_Manager(ManagerProfileResponse managerProfile);

    @Mapping(target = "role", ignore = true)
    UserResponse toUserResponse_Staff(StaffProfileResponse staffProfile);
}
