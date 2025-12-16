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
@Table(name = "bonus_templates")
public class BonusTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "template_id")
    Integer templateId;

    @Column(name = "branch_id")
    Integer branchId; // NULL = SYSTEM scope, có giá trị = BRANCH scope

    @Column(name = "name", nullable = false, length = 100)
    String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "bonus_type", nullable = false, length = 50)
    BonusType bonusType;

    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    BigDecimal amount;

    @Column(name = "description", columnDefinition = "TEXT")
    String description;

    @Column(name = "criteria_ref", length = 255)
    String criteriaRef;

    @Column(name = "is_active")
    Boolean isActive;

    @Column(name = "created_by", nullable = false)
    Integer createdBy; // Admin user_id

    @Column(name = "create_at", nullable = false, updatable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
    LocalDateTime createAt;

    @Column(name = "update_at", nullable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
    LocalDateTime updateAt;

    public enum BonusType {
        PERFORMANCE, STORE_TARGET, HOLIDAY, REFERRAL, SPECIAL
    }

    /**
     * Tính scope từ branch_id
     * @return "SYSTEM" nếu branch_id = NULL, "BRANCH" nếu branch_id != NULL
     */
    public String getScope() {
        return branchId == null ? "SYSTEM" : "BRANCH";
    }
}

