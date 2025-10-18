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
@Table(name = "stocks")
public class Stock {


    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "stock_id")
    Integer stockId;


    @ManyToOne
    @JoinColumn(name = "ingredient_id", nullable = false)
    Ingredient ingredient;


    @Column(name = "branch_id")
    Integer branchId;


    @Column(nullable = false, columnDefinition = "DECIMAL(12,4) DEFAULT 0.0000")
    BigDecimal quantity;


    @ManyToOne
    @JoinColumn(name = "unit_code", referencedColumnName = "code")
    Unit unit;


    @Column(nullable = false, columnDefinition = "DECIMAL(12,4) DEFAULT 0.0000")
    BigDecimal threshold;

    @Column(name = "reserved_quantity", nullable = false, columnDefinition = "DECIMAL(12,4) DEFAULT 0.0000")
    @Builder.Default
    BigDecimal reservedQuantity = BigDecimal.ZERO;

    @Column(name = "last_updated", nullable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
    LocalDateTime lastUpdated;

    // Helper methods
    public BigDecimal getAvailableQuantity() {
        return quantity.subtract(reservedQuantity);
    }

    public boolean hasEnoughStock(BigDecimal requiredQuantity) {
        return getAvailableQuantity().compareTo(requiredQuantity) >= 0;
    }

    public boolean isLowStock() {
        return getAvailableQuantity().compareTo(threshold) <= 0;
    }

    public boolean isOutOfStock() {
        return getAvailableQuantity().compareTo(BigDecimal.ZERO) <= 0;
    }
}