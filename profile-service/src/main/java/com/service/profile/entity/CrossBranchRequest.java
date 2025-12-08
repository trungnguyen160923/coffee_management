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
@Table(name = "cross_branch_requests")
public class CrossBranchRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "request_id")
    Integer requestId;

    @Column(name = "from_branch_id", nullable = false)
    Integer fromBranchId;

    @Column(name = "to_branch_id", nullable = false)
    Integer toBranchId;

    @Column(name = "staff_user_id", nullable = false)
    Integer staffUserId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_id", nullable = false)
    Shift shift;

    @Column(name = "requested_by", nullable = false)
    Integer requestedBy;

    @Column(name = "status", nullable = false, length = 20)
    String status;

    @Column(name = "reason")
    String reason;

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


