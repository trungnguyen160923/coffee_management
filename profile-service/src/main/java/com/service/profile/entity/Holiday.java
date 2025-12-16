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
@Table(name = "holidays")
public class Holiday {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "holiday_id")
    Integer holidayId;

    @Column(name = "holiday_date", nullable = false, unique = true)
    LocalDate holidayDate;

    @Column(name = "holiday_name", nullable = false, length = 255)
    String holidayName;

    @Column(name = "description", columnDefinition = "TEXT")
    String description;

    @Column(name = "is_active")
    Boolean isActive;
}

