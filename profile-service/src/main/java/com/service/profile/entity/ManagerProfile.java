package com.service.profile.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "manager_profiles")
public class ManagerProfile {

    @Id
    @Column(name = "user_id")
    Integer userId;

    @Column(name = "branch_id", nullable = false)
    Integer branchId; // loose reference -> order_db.branches

    @Column(name = "hire_date", nullable = false)
    LocalDate hireDate;

    @Column(name = "identity_card", nullable = false, length = 50)
    String identityCard;

    @Column(name = "base_salary", nullable = false, precision = 12, scale = 2)
    java.math.BigDecimal baseSalary;

    @Column(name = "insurance_salary", precision = 12, scale = 2)
    java.math.BigDecimal insuranceSalary;

    @Column(name = "overtime_rate", precision = 12, scale = 2)
    java.math.BigDecimal overtimeRate;

    @Column(name = "number_of_dependents")
    Integer numberOfDependents;

    @Column(name = "create_at", nullable = false, updatable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
    java.time.LocalDateTime createAt;

    @Column(name = "update_at", nullable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
    java.time.LocalDateTime updateAt;
}
