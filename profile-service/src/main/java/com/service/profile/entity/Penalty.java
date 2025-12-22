package com.service.profile.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "penalties")
public class Penalty {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "penalty_id")
    Integer penaltyId;

    @Column(name = "user_id", nullable = false)
    Integer userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "user_role", nullable = false, length = 20)
    UserRole userRole;

    @Column(name = "branch_id", nullable = false)
    Integer branchId;

    @Column(name = "period", nullable = false, length = 7)
    String period; // Format: YYYY-MM

    // Thông tin phạt
    @Enumerated(EnumType.STRING)
    @Column(name = "penalty_type", nullable = false, length = 50)
    PenaltyType penaltyType;

    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    BigDecimal amount;

    @Column(name = "reason_code", length = 50)
    String reasonCode;

    @Column(name = "description", columnDefinition = "TEXT")
    String description;

    @Column(name = "incident_date")
    LocalDate incidentDate;

    @Column(name = "shift_id")
    Integer shiftId; // Tham chiếu đến shift nếu liên quan

    @Column(name = "source_template_id")
    Integer sourceTemplateId; // ID của template/penalty_config được sử dụng (NULL = custom)

    // Trạng thái và quy trình
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    PenaltyStatus status;

    @Column(name = "created_by", nullable = false)
    Integer createdBy; // 0 = System tự động

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

    public enum PenaltyType {
        LATE, NO_SHOW, EARLY_LEAVE, MISTAKE, VIOLATION, UNPAID_LEAVE, OTHER
    }

    public enum PenaltyStatus {
        PENDING, APPROVED, REJECTED
    }
}

