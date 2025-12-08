package com.service.profile.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "shift_requests")
public class ShiftRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "request_id")
    Integer requestId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignment_id", nullable = false)
    ShiftAssignment assignment;

    @Column(name = "staff_user_id", nullable = false)
    Integer staffUserId; // owner

    @Column(name = "request_type", nullable = false, length = 20)
    String requestType; // SWAP / LEAVE / OVERTIME

    @Column(name = "target_staff_user_id")
    Integer targetStaffUserId; // for SWAP

    @Column(name = "overtime_hours", precision = 4, scale = 2)
    java.math.BigDecimal overtimeHours; // for OVERTIME

    @Column(nullable = false, length = 255)
    String reason;

    @Column(name = "status", nullable = false, length = 50)
    String status;

    @Column(name = "requested_at", nullable = false)
    LocalDateTime requestedAt;

    @Column(name = "reviewed_by")
    Integer reviewedBy;

    @Column(name = "reviewed_at")
    LocalDateTime reviewedAt;

    @Column(name = "review_notes")
    String reviewNotes;

    @Column(name = "create_at", nullable = false, updatable = false)
    LocalDateTime createAt;

    @Column(name = "update_at", nullable = false)
    LocalDateTime updateAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createAt = now;
        this.updateAt = now;
        if (this.requestedAt == null) {
            this.requestedAt = now;
        }
        if (this.status == null) {
            this.status = "PENDING";
        }
    }

    @PreUpdate
    void onUpdate() {
        this.updateAt = LocalDateTime.now();
    }
}


