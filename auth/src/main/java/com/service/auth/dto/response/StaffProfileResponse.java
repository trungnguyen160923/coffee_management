package com.service.auth.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.math.BigDecimal;

import com.service.auth.entity.Role;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffProfileResponse {
    private Integer userId;
    private String email;
    private String fullname;
    private String phone_number;
    private Role role;
    private String identityCard;
    private BranchResponse branch;
    private LocalDate hireDate;
    private String position;
    private Double salary;
    
    // Staff profile fields
    private String employmentType; // FULL_TIME / PART_TIME / CASUAL
    private String payType;        // MONTHLY / HOURLY
    private BigDecimal baseSalary;
    private BigDecimal hourlyRate;
    private BigDecimal insuranceSalary;
    private BigDecimal overtimeRate;
    private Integer numberOfDependents;
    
    // Staff business roles & proficiency
    private List<Integer> staffBusinessRoleIds;
    private String proficiencyLevel;
}
