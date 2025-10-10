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
@Table(name = "purchase_order_details")
public class PurchaseOrderDetail {


    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Integer id;


    @ManyToOne
    @JoinColumn(name = "po_id", nullable = false)
    PurchaseOrder purchaseOrder;


    @ManyToOne
    @JoinColumn(name = "ingredient_id", nullable = false)
    Ingredient ingredient;


    @Column(nullable = false, columnDefinition = "DECIMAL(12,4) DEFAULT 0.0000")
    BigDecimal qty;


    @ManyToOne
    @JoinColumn(name = "unit_code", referencedColumnName = "code")
    Unit unit;


    @Column(name = "unit_price", nullable = false, columnDefinition = "DECIMAL(12,2) DEFAULT 0.00")
    BigDecimal unitPrice;


    @Column(name = "line_total", nullable = false, columnDefinition = "DECIMAL(12,2) DEFAULT 0.00")
    BigDecimal lineTotal;

    @Column(name = "create_at", nullable = false, updatable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
    LocalDateTime createAt;

    @Column(name = "update_at", nullable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
    LocalDateTime updateAt;
}