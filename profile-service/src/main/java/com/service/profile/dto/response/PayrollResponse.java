package com.service.profile.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PayrollResponse {
    Integer payrollId;
    Integer userId;
    String userRole;
    Integer branchId;
    String period;
    
    // Display fields
    String userName;
    String branchName;

    // Thành phần lương (Snapshot)
    BigDecimal baseSalary;
    BigDecimal baseSalarySnapshot;
    BigDecimal hourlyRateSnapshot;
    BigDecimal insuranceSalarySnapshot;

    // Overtime
    BigDecimal overtimeHours;
    BigDecimal overtimePay;

    // Các khoản cộng
    BigDecimal totalAllowances;
    BigDecimal totalBonuses;

    // Các khoản trừ
    BigDecimal totalPenalties;

    // Tổng lương
    BigDecimal grossSalary;

    // Khấu trừ
    BigDecimal amountInsurances;
    BigDecimal amountTax;
    BigDecimal amountAdvances;
    BigDecimal totalDeductions;

    // Lương thực nhận
    BigDecimal netSalary;

    // Trạng thái và quy trình
    String status;
    Integer createdBy;
    Integer approvedBy;
    LocalDateTime approvedAt;
    LocalDateTime paidAt;

    // Ghi chú
    String notes;

    // Timestamps
    LocalDateTime createAt;
    LocalDateTime updateAt;
}

