package com.service.profile.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class StaffProfileResponse {
    Integer userId;
    BranchResponse branch;
    String identityCard;
    LocalDate hireDate;
    String employmentType; // FULL_TIME / PART_TIME / CASUAL
    String payType;        // MONTHLY / HOURLY
    java.math.BigDecimal baseSalary;
    java.math.BigDecimal hourlyRate;
    java.math.BigDecimal overtimeRate;
    LocalDateTime createAt;
    LocalDateTime updateAt;
    
    // Staff business roles & proficiency
    List<Integer> staffBusinessRoleIds;
    String proficiencyLevel;
}
