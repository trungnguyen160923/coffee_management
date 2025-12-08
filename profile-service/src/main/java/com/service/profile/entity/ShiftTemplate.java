package com.service.profile.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "shift_templates")
public class ShiftTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "template_id")
    Integer templateId;

    @Column(name = "branch_id", nullable = false)
    Integer branchId; // loose reference to order_db.branches

    @Column(nullable = false, length = 100)
    String name;

    @Column(name = "start_time", nullable = false)
    LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    LocalTime endTime;

    @Column(name = "duration_hours", nullable = false, precision = 4, scale = 2)
    java.math.BigDecimal durationHours;

    @Column(name = "max_staff_allowed")
    Integer maxStaffAllowed;

    @Column(name = "employment_type", length = 20)
    String employmentType; // FULL_TIME, PART_TIME, CASUAL, ANY

    @Column(name = "is_active")
    Boolean isActive;

    @Column(length = 255)
    String description;

    @Column(name = "create_at", nullable = false, updatable = false)
    LocalDateTime createAt;

    @Column(name = "update_at", nullable = false)
    LocalDateTime updateAt;

    @PrePersist
    void onCreate() {
        this.createAt = LocalDateTime.now();
        this.updateAt = LocalDateTime.now();
        if (isActive == null) {
            isActive = Boolean.TRUE;
        }
        if (employmentType == null) {
            employmentType = "ANY"; // Default: tất cả loại nhân viên đều có thể đăng ký
        }
    }

    @PreUpdate
    void onUpdate() {
        this.updateAt = LocalDateTime.now();
    }
}


