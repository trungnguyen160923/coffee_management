package com.service.auth.dto.response;

import java.time.LocalDate;
import java.util.List;

import com.service.auth.entity.Role;
import lombok.*;
import lombok.experimental.FieldDefaults;

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
    Role role;
    String identityCard;
    BranchResponse branch;
    LocalDate hireDate;
    String position;
    Double salary;
    Byte adminLevel;
    String notes;
    
    // Staff business roles & proficiency (only for STAFF role)
    List<Integer> staffBusinessRoleIds;
    String proficiencyLevel;
}
