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
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "inventory_costs")
public class InventoryCost {

    @EmbeddedId
    InventoryCostId id;

    // Composite FK to stocks(ingredient_id, branch_id)
    @ManyToOne(optional = false)
    @JoinColumns({
            @JoinColumn(name = "ingredient_id", referencedColumnName = "ingredient_id", insertable = false, updatable = false),
            @JoinColumn(name = "branch_id", referencedColumnName = "branch_id", insertable = false, updatable = false)
    })
    Stock stock;

    @Column(name = "avg_cost", nullable = false, columnDefinition = "DECIMAL(12,4) DEFAULT 0.0000")
    BigDecimal avgCost;

    @Column(name = "updated_at", nullable = false, columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
    LocalDateTime updatedAt;
}

// InventoryCostId moved to its own public class file for visibility across packages


