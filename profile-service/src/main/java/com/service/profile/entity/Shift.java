package com.service.profile.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.math.BigDecimal;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "shifts")
public class Shift {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "shift_id")
    Integer shiftId;

    @Column(name = "branch_id", nullable = false)
    Integer branchId; // loose reference to order_db.branches

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id")
    ShiftTemplate template;

    @Column(name = "shift_date", nullable = false)
    LocalDate shiftDate;

    @Column(name = "start_time", nullable = false)
    LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    LocalTime endTime;

    @Column(name = "duration_hours", nullable = false, precision = 4, scale = 2)
    BigDecimal durationHours;

    @Column(name = "max_staff_allowed")
    Integer maxStaffAllowed;

    @Column(name = "employment_type", length = 20)
    String employmentType; // FULL_TIME, PART_TIME, CASUAL, ANY. NULL = kế thừa từ template

    @Column(name = "status", nullable = false, length = 20)
    String status;

    @Column(name = "shift_type", nullable = false, length = 20)
    String shiftType; // NORMAL, WEEKEND, HOLIDAY, OVERTIME

    @Column(name = "created_by", nullable = false)
    Integer createdBy; // manager user_id

    @Column
    String notes;

    @Column(name = "create_at", nullable = false, updatable = false)
    LocalDateTime createAt;

    @Column(name = "update_at", nullable = false)
    LocalDateTime updateAt;

    @PrePersist
    void onCreate() {
        this.createAt = LocalDateTime.now();
        this.updateAt = LocalDateTime.now();
        if (status == null) {
            status = "DRAFT";
        }
        // Nếu employmentType null và có template, kế thừa từ template
        if (employmentType == null && template != null && template.getEmploymentType() != null) {
            employmentType = template.getEmploymentType();
        }
        // Nếu shiftType null, tự động xác định dựa trên shiftDate
        if (shiftType == null && shiftDate != null) {
            // Kiểm tra xem có phải cuối tuần không
            java.time.DayOfWeek dayOfWeek = shiftDate.getDayOfWeek();
            if (dayOfWeek == java.time.DayOfWeek.SATURDAY || dayOfWeek == java.time.DayOfWeek.SUNDAY) {
                shiftType = "WEEKEND";
            } else {
                shiftType = "NORMAL";
            }
        } else if (shiftType == null) {
            // Fallback nếu không có shiftDate
            shiftType = "NORMAL";
        }
    }

    @PreUpdate
    void onUpdate() {
        this.updateAt = LocalDateTime.now();
    }
}


