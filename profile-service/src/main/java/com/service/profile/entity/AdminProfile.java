package com.service.profile.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "admin_profiles")
public class AdminProfile {

    @Id
    @Column(name = "user_id")
    Integer userId; // loose reference -> auth_db.users

    @Column(name = "admin_level", nullable = false)
    Byte adminLevel = 1;

    @Column(columnDefinition = "TEXT")
    String notes;

    @Column(name = "create_at", nullable = false, updatable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
    java.time.LocalDateTime createAt;

    @Column(name = "update_at", nullable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
    java.time.LocalDateTime updateAt;
}
