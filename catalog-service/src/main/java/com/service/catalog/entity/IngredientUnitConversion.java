package com.service.catalog.entity;

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
@FieldDefaults(level = lombok.AccessLevel.PRIVATE)
@Entity
@Table(name = "ingredient_unit_conversions")
public class IngredientUnitConversion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    Long id;

    @Column(name = "ingredient_id", nullable = false)
    Integer ingredientId;

    @Column(name = "from_unit_code", nullable = false, length = 20)
    String fromUnitCode;

    @Column(name = "to_unit_code", nullable = false, length = 20)
    String toUnitCode;

    @Column(name = "conversion_factor", nullable = false, precision = 18, scale = 8)
    BigDecimal factor;

    @Column(name = "note", length = 255)
    String note;

    @Enumerated(EnumType.STRING)
    @Column(name = "scope", nullable = false)
    ConversionScope scope;

    @Column(name = "branch_id")
    Integer branchId;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    Boolean isActive = true;

    @Column(name = "create_at", nullable = false)
    LocalDateTime createAt;

    @Column(name = "update_at", nullable = false)
    LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum ConversionScope {
        GLOBAL, BRANCH
    }
}