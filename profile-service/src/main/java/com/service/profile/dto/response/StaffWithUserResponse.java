package com.service.profile.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO kết hợp thông tin từ StaffProfile và User từ auth-service
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class StaffWithUserResponse {
    // Thông tin từ User (auth-service)
    Integer userId;
    String email;
    String fullname;
    String phoneNumber;
    LocalDate dob;
    String avatarUrl;
    String bio;
    String roleName; // Tên role từ User
    
    // Thông tin từ StaffProfile (profile-service)
    BranchResponse branch;
    String identityCard;
    LocalDate hireDate;
    String employmentType;
    String payType;
    java.math.BigDecimal baseSalary;
    java.math.BigDecimal hourlyRate;
    java.math.BigDecimal overtimeRate;
    LocalDateTime createAt;
    LocalDateTime updateAt;

    // Staff business roles & proficiency
    List<Integer> staffBusinessRoleIds;
    String proficiencyLevel;
}

