package com.service.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.service.auth.validator.RoleConstraint;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ManagerProfileCreationRequest {

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

    // Optional payroll-related fields for manager
    private BigDecimal baseSalary;

    private Integer numberOfDependents;
}
