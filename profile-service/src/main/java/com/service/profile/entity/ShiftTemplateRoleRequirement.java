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
@Table(name = "shift_template_role_requirements")
public class ShiftTemplateRoleRequirement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    ShiftTemplate template;

    @Column(name = "role_id", nullable = false)
    Integer roleId; // loose reference to auth_db.roles.role_id

    @Column(nullable = false)
    Integer quantity;

    @Column(name = "is_required")
    Boolean required;

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
        if (required == null) {
            required = Boolean.TRUE;
        }
    }

    @PreUpdate
    void onUpdate() {
        this.updateAt = LocalDateTime.now();
    }
}

