package com.service.profile.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;

/**
 * DTO để map UserResponse từ auth-service
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserResponse {
    Integer user_id;
    String email;
    String fullname;
    String phoneNumber;
    LocalDate dob;
    String avatarUrl;
    String bio;
    RoleResponse role;
    String identityCard;
    BranchResponse branch;
    LocalDate hireDate;
    String position;
    Double salary;
    Byte adminLevel;
    String notes;
    
    /**
     * Inner class để map Role từ auth-service
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class RoleResponse {
        Integer roleId;
        String name;
        String description;
    }
}

