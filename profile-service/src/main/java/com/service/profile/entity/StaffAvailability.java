package com.service.profile.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "staff_availability")
public class StaffAvailability {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "availability_id")
    Integer availabilityId;

    @Column(name = "staff_user_id", nullable = false)
    Integer staffUserId;

    @Column(name = "day_of_week", nullable = false)
    Integer dayOfWeek; // 1-7

    @Column(name = "start_time")
    LocalTime startTime;

    @Column(name = "end_time")
    LocalTime endTime;

    @Column(name = "is_available", nullable = false)
    Boolean available;

    @Column
    String notes;

    @Column(name = "effective_from")
    LocalDate effectiveFrom;

    @Column(name = "effective_to")
    LocalDate effectiveTo;

    @Column(name = "create_at", nullable = false, updatable = false)
    LocalDateTime createAt;

    @Column(name = "update_at", nullable = false)
    LocalDateTime updateAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createAt = now;
        this.updateAt = now;
        if (available == null) {
            available = Boolean.TRUE;
        }
    }

    @PreUpdate
    void onUpdate() {
        this.updateAt = LocalDateTime.now();
    }
}


