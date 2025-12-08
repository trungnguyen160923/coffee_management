package com.service.profile.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.math.BigDecimal;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "staff_profiles")
public class StaffProfile {

    @Id
    @Column(name = "user_id")
    Integer userId;

    @Column(name = "branch_id", nullable = false)
    Integer branchId; // loose reference -> order_db.branches

    @Column(name = "identity_card", nullable = false, length = 50)
    String identityCard;

    @Column(name = "hire_date", nullable = false)
    LocalDate hireDate;

    @Column(name = "employment_type", nullable = false, length = 20)
    String employmentType; // FULL_TIME / PART_TIME / CASUAL

    @Column(name = "pay_type", nullable = false, length = 20)
    String payType; // MONTHLY / HOURLY

    @Column(name = "base_salary", nullable = false, precision = 12, scale = 2)
    BigDecimal baseSalary; // lương tháng cho FULL_TIME (0 nếu PART_TIME)

    @Column(name = "hourly_rate", nullable = false, precision = 12, scale = 2)
    BigDecimal hourlyRate;

    @Column(name = "overtime_rate", precision = 12, scale = 2)
    BigDecimal overtimeRate;

    @Column(name = "create_at", nullable = false, updatable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
    LocalDateTime createAt;

    @Column(name = "update_at", nullable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
    LocalDateTime updateAt;
}
