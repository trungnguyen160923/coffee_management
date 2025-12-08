package com.service.profile.dto.request;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class StaffProfileCreationRequest {

    @JsonProperty(required = true)
    @NotNull(message = "EMPTY_USER_ID")
    Integer userId;

    @NotNull(message = "EMPTY_BRANCH_ID")
    Integer branchId;

    @NotNull(message = "EMPTY_IDENTITY_CARD")
    String identityCard;

    @NotNull(message = "EMPTY_HIRE_DATE")
    LocalDate hireDate;

    // Lương cơ bản theo tháng cho FULL_TIME (baseSalary) – có thể null nếu payType = HOURLY
    BigDecimal baseSalary;

    // Đơn giá lương theo giờ cho PART_TIME / CASUAL
    BigDecimal hourlyRate;

    // Đơn giá lương tăng ca theo giờ
    BigDecimal overtimeRate;

    // Kiểu employment và cách tính lương
    String employmentType; // FULL_TIME / PART_TIME / CASUAL
    String payType;        // MONTHLY / HOURLY
}
