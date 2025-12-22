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
@Table(name = "bonuses")
public class Bonus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "bonus_id")
    Integer bonusId;

    @Column(name = "user_id", nullable = false)
    Integer userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "user_role", nullable = false, length = 20)
    UserRole userRole;

    @Column(name = "branch_id", nullable = false)
    Integer branchId;

    @Column(name = "period", nullable = false, length = 7)
    String period; // Format: YYYY-MM

    // Thông tin thưởng
    @Enumerated(EnumType.STRING)
    @Column(name = "bonus_type", nullable = false, length = 50)
    BonusType bonusType;

    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    BigDecimal amount;

    @Column(name = "description", columnDefinition = "TEXT")
    String description;

    @Column(name = "criteria_ref", length = 255)
    String criteriaRef;

    @Column(name = "source_template_id")
    Integer sourceTemplateId; // ID của template được sử dụng (NULL = custom)

    @Column(name = "shift_id")
    Integer shiftId; // Ca làm việc liên quan (nullable)

    // Trạng thái và quy trình
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    BonusStatus status;

    @Column(name = "created_by", nullable = false)
    Integer createdBy;

    @Column(name = "approved_by")
    Integer approvedBy;

    @Column(name = "approved_at")
    LocalDateTime approvedAt;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    String rejectionReason;

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

    public enum BonusType {
        PERFORMANCE, ATTENDANCE, STORE_TARGET, HOLIDAY, REFERRAL, SPECIAL, OTHER
    }

    public enum BonusStatus {
        PENDING, APPROVED, REJECTED
    }
}

