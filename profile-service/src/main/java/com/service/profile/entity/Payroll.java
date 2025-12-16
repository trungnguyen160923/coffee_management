package com.service.profile.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "payrolls")
public class Payroll {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "payroll_id")
    Integer payrollId;

    @Column(name = "user_id", nullable = false)
    Integer userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "user_role", nullable = false, length = 20)
    UserRole userRole;

    @Column(name = "branch_id", nullable = false)
    Integer branchId;

    @Column(name = "period", nullable = false, length = 7)
    String period; // Format: YYYY-MM

    // Thành phần lương (Snapshot - lưu giá trị tại thời điểm tính)
    @Column(name = "base_salary", nullable = false, precision = 12, scale = 2)
    BigDecimal baseSalary;

    @Column(name = "base_salary_snapshot", precision = 12, scale = 2)
    BigDecimal baseSalarySnapshot;

    @Column(name = "hourly_rate_snapshot", precision = 12, scale = 2)
    BigDecimal hourlyRateSnapshot;

    @Column(name = "insurance_salary_snapshot", precision = 12, scale = 2)
    BigDecimal insuranceSalarySnapshot;

    // Overtime
    @Column(name = "overtime_hours", precision = 4, scale = 2)
    BigDecimal overtimeHours;

    @Column(name = "overtime_pay", precision = 12, scale = 2)
    BigDecimal overtimePay;

    // Các khoản cộng
    @Column(name = "total_allowances", precision = 12, scale = 2)
    BigDecimal totalAllowances;

    @Column(name = "total_bonuses", precision = 12, scale = 2)
    BigDecimal totalBonuses;

    // Các khoản trừ
    @Column(name = "total_penalties", precision = 12, scale = 2)
    BigDecimal totalPenalties;

    // Tổng lương
    @Column(name = "gross_salary", nullable = false, precision = 12, scale = 2)
    BigDecimal grossSalary;

    // Khấu trừ (tách rõ từng khoản)
    @Column(name = "amount_insurances", precision = 15, scale = 2)
    BigDecimal amountInsurances;

    @Column(name = "amount_tax", precision = 15, scale = 2)
    BigDecimal amountTax;

    @Column(name = "amount_advances", precision = 15, scale = 2)
    BigDecimal amountAdvances;

    @Column(name = "total_deductions", precision = 15, scale = 2)
    BigDecimal totalDeductions;

    // Lương thực nhận
    @Column(name = "net_salary", nullable = false, precision = 15, scale = 2)
    BigDecimal netSalary;

    // Trạng thái và quy trình
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    PayrollStatus status;

    @Column(name = "created_by", nullable = false)
    Integer createdBy;

    @Column(name = "approved_by")
    Integer approvedBy;

    @Column(name = "approved_at")
    LocalDateTime approvedAt;

    @Column(name = "paid_at")
    LocalDateTime paidAt;

    // Ghi chú
    @Column(name = "notes", columnDefinition = "TEXT")
    String notes;

    // Timestamps
    @Column(name = "create_at", nullable = false, updatable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
    LocalDateTime createAt;

    @Column(name = "update_at", nullable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
    LocalDateTime updateAt;

    public enum UserRole {
        STAFF, MANAGER
    }

    public enum PayrollStatus {
        DRAFT, REVIEW, APPROVED, PAID
    }
}

