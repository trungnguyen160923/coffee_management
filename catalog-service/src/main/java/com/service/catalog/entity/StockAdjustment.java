package com.service.catalog.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "stock_adjustments",
        indexes = {
                @Index(name = "idx_sa_branch_date", columnList = "branch_id, adjustment_date"),
                @Index(name = "idx_sa_ingredient", columnList = "ingredient_id"),
                @Index(name = "idx_sa_variance", columnList = "ingredient_id, adjustment_date, adjustment_type")
        })
public class StockAdjustment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "adjustment_id")
    Long adjustmentId;

    @Column(name = "branch_id", nullable = false)
    Integer branchId;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "ingredient_id", nullable = false)
    Ingredient ingredient;

    @Enumerated(EnumType.STRING)
    @Column(name = "adjustment_type", nullable = false, length = 32)
    AdjustmentType adjustmentType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    @Builder.Default
    AdjustmentStatus status = AdjustmentStatus.PENDING;

    @Column(name = "quantity", nullable = false, columnDefinition = "DECIMAL(12,4) DEFAULT 0.0000")
    BigDecimal quantity;

    @Column(name = "system_quantity", nullable = false, columnDefinition = "DECIMAL(12,4) DEFAULT 0.0000")
    BigDecimal systemQuantity;

    @Column(name = "actual_quantity", nullable = false, columnDefinition = "DECIMAL(12,4) DEFAULT 0.0000")
    BigDecimal actualQuantity;

    @Column(name = "variance", nullable = false, columnDefinition = "DECIMAL(12,4) DEFAULT 0.0000")
    BigDecimal variance;

    @Builder.Default
    @Column(name = "entry_count", nullable = false, columnDefinition = "INT DEFAULT 0")
    Integer entryCount = 0;

    @Column(name = "last_entry_at")
    LocalDateTime lastEntryAt;

    @Column(name = "reason", length = 100)
    String reason;

    @Column(name = "user_id")
    Integer userId;

    @Column(name = "adjusted_by", length = 100)
    String adjustedBy;

    @Column(name = "adjustment_date", nullable = false)
    LocalDate adjustmentDate;

    @Column(name = "notes", length = 255)
    String notes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    LocalDateTime updatedAt;

    @Builder.Default
    @OneToMany(mappedBy = "adjustment", cascade = CascadeType.ALL, orphanRemoval = true)
    @ToString.Exclude
    List<StockAdjustmentEntry> entries = new java.util.ArrayList<>();

    public enum AdjustmentType {
        ADJUST_IN,
        ADJUST_OUT
    }

    public enum AdjustmentStatus {
        PENDING,
        COMMITTED,
        CANCELLED,
        AUTO_COMMITTED
    }
}

