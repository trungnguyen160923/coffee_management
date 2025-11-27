package com.service.catalog.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "stock_adjustment_entries",
        indexes = {
                @Index(name = "idx_sae_adjustment", columnList = "adjustment_id"),
                @Index(name = "idx_sae_branch_ing", columnList = "branch_id, ingredient_id")
        })
public class StockAdjustmentEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "entry_id")
    Long entryId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "adjustment_id", nullable = false)
    StockAdjustment adjustment;

    @Column(name = "branch_id", nullable = false)
    Integer branchId;

    @Column(name = "ingredient_id", nullable = false)
    Integer ingredientId;

    @Column(name = "entry_quantity", nullable = false, columnDefinition = "DECIMAL(12,4) DEFAULT 0.0000")
    BigDecimal entryQuantity;

    @Column(name = "recorded_by", length = 100)
    String recordedBy;

    @Column(name = "user_id")
    Integer userId;

    @Column(name = "entry_time", nullable = false)
    LocalDateTime entryTime;

    @Column(name = "notes", length = 255)
    String notes;

    @Column(name = "source", length = 50)
    String source;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt;
}

