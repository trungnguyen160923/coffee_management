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
@Table(name = "shift_assignments")
public class ShiftAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "assignment_id")
    Integer assignmentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_id", nullable = false)
    Shift shift;

    @Column(name = "staff_user_id", nullable = false)
    Integer staffUserId; // loose reference to auth_db.users.user_id

    @Column(name = "assignment_type", nullable = false, length = 20)
    String assignmentType;

    @Column(name = "status", nullable = false, length = 20)
    String status;

    @Column(name = "is_borrowed_staff", nullable = false)
    Boolean borrowedStaff;

    @Column(name = "staff_base_branch_id")
    Integer staffBaseBranchId;

    @Column(name = "checked_in_at")
    LocalDateTime checkedInAt;

    @Column(name = "checked_out_at")
    LocalDateTime checkedOutAt;

    @Column(name = "actual_hours", precision = 4, scale = 2)
    BigDecimal actualHours;

    @Column
    String notes;

    @Column(name = "assigned_by", nullable = false)
    Integer assignedBy; // manager user_id

    @Column(name = "create_at", nullable = false, updatable = false)
    LocalDateTime createAt;

    @Column(name = "update_at", nullable = false)
    LocalDateTime updateAt;

    @PrePersist
    void onCreate() {
        this.createAt = LocalDateTime.now();
        this.updateAt = LocalDateTime.now();
        if (borrowedStaff == null) {
            borrowedStaff = Boolean.FALSE;
        }
        if (status == null) {
            status = "PENDING";
        }
        if (assignmentType == null) {
            assignmentType = "MANUAL";
        }
    }

    @PreUpdate
    void onUpdate() {
        this.updateAt = LocalDateTime.now();
    }
}


