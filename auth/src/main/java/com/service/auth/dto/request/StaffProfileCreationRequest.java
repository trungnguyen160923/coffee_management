package com.service.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

import com.service.auth.validator.RoleConstraint;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffProfileCreationRequest {
    @Email(message = "EMAIL_INVALID")
    @NotBlank(message = "EMPTY_EMAIL")
    String email;

    @Size(min = 6, message = "INVALID_PASSWORD")
    @NotBlank(message = "EMPTY_PASSWORD")
    String password;

    @NotBlank(message = "EMPTY_FULLNAME")
    String fullname;

    @NotBlank(message = "EMPTY_PHONE_NUMBER")
    String phoneNumber;

    @NotBlank(message = "EMPTY_ROLE")
    @RoleConstraint(message = "INVALID_ROLE")
    String role;

    
    @NotNull(message = "EMPTY_IDENTITY_CARD")
    private String identityCard;
    
    @NotNull(message = "EMPTY_BRANCH_ID")
    private Integer branchId;
    
    @NotNull(message = "EMPTY_HIRE_DATE")
    private LocalDate hireDate;
    
    // @NotNull(message = "EMPTY_SALARY")
    private Double salary;

    // New fields for employment type & pay structure
    // FULL_TIME / PART_TIME / CASUAL
    @NotNull(message = "EMPTY_EMPLOYMENT_TYPE")
    private String employmentType;

    // MONTHLY / HOURLY
    @NotNull(message = "EMPTY_PAY_TYPE")
    private String payType;

    // Hourly rate for PART_TIME / CASUAL
    private Double hourlyRate;

    // Overtime rate per hour
    private Double overtimeRate;

    // Business roles (BARISTA_STAFF, CASHIER_STAFF, ...), optional
    private List<Integer> staffBusinessRoleIds;

    // Proficiency level for assigned roles (applied to all initially)
    private String proficiencyLevel; // BEGINNER / INTERMEDIATE / ADVANCED / EXPERT
}
