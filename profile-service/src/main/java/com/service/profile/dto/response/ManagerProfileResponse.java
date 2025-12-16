package com.service.profile.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ManagerProfileResponse {
    Integer userId;
    LocalDate hireDate;
    String identityCard;
    BigDecimal baseSalary;
    BigDecimal insuranceSalary;
    BigDecimal overtimeRate;
    Integer numberOfDependents;
    LocalDateTime createAt;
    LocalDateTime updateAt;
    BranchResponse branch;
}
