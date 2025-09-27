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


    @Column(nullable = false, columnDefinition = "DECIMAL(12,2) DEFAULT 0.00")
    BigDecimal quantity;


    @Column(length = 50)
    String unit;


    @Column(nullable = false, columnDefinition = "DECIMAL(12,2) DEFAULT 0.00")
    BigDecimal threshold;


    @Column(name = "last_updated", nullable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
    LocalDateTime lastUpdated;
}