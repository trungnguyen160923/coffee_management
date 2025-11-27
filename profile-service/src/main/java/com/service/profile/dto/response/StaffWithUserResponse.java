package com.service.profile.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

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
    String position;
    LocalDate hireDate;
    BigDecimal salary;
    LocalDateTime createAt;
    LocalDateTime updateAt;
}

