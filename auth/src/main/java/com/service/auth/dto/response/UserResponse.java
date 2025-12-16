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
    
    // Shared profile fields (for both MANAGER and STAFF roles)
    java.math.BigDecimal insuranceSalary;
    java.math.BigDecimal overtimeRate;
    Integer numberOfDependents;
    
    // Staff profile fields (only for STAFF role)
    String employmentType; // FULL_TIME / PART_TIME / CASUAL
    String payType;        // MONTHLY / HOURLY
    java.math.BigDecimal hourlyRate;
    java.math.BigDecimal baseSalary;
    List<Integer> staffBusinessRoleIds;
    String proficiencyLevel;
}
