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


    @Column(nullable = false, columnDefinition = "DECIMAL(12,2) DEFAULT 0.00")
    BigDecimal qty;


    @Column(name = "unit_price", nullable = false, columnDefinition = "DECIMAL(12,2) DEFAULT 0.00")
    BigDecimal unitPrice;


    @Column(name = "line_total", nullable = false, columnDefinition = "DECIMAL(12,2) DEFAULT 0.00")
    BigDecimal lineTotal;
}