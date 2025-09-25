package com.service.auth.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.service.auth.dto.request.UserCreationRequest;
import com.service.auth.dto.response.UserResponse;
import com.service.auth.entity.User;

@Mapper(componentModel = "spring")
public interface UserMapper {
    @Mapping(target = "role", ignore = true)
    @Mapping(source = "phone_number", target = "phoneNumber")
    User toUser(UserCreationRequest request);

    @Mapping(source = "userId", target = "user_id")
    @Mapping(source = "phoneNumber", target = "phone_number")
    UserResponse toUserCreationResponse(User user);

}
