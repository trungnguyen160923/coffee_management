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
@Table(name = "allowances")
public class Allowance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "allowance_id")
    Integer allowanceId;

    @Column(name = "user_id", nullable = false)
    Integer userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "user_role", nullable = false, length = 20)
    UserRole userRole;

    @Column(name = "branch_id", nullable = false)
    Integer branchId;

    @Column(name = "period", nullable = false, length = 7)
    String period; // Format: YYYY-MM

    // Thông tin phụ cấp
    @Enumerated(EnumType.STRING)
    @Column(name = "allowance_type", nullable = false, length = 50)
    AllowanceType allowanceType;

    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    BigDecimal amount;

    @Column(name = "description", columnDefinition = "TEXT")
    String description;

    @Column(name = "source_template_id")
    Integer sourceTemplateId; // ID của template được sử dụng (NULL = custom)

    // Trạng thái
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    AllowanceStatus status;

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

    public enum AllowanceType {
        MEAL, TRANSPORT, PHONE, ROLE, OTHER
    }

    public enum AllowanceStatus {
        ACTIVE, INACTIVE
    }
}

