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
@Table(name = "inventory_transactions")
public class InventoryTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(name = "branch_id", nullable = false)
    Integer branchId;

    @ManyToOne(optional = false)
    @JoinColumn(name = "ingredient_id")
    Ingredient ingredient;

    @Column(name = "txn_type", nullable = false, length = 32)
    String txnType; // RECEIPT, ISSUE, ADJUST_IN, ADJUST_OUT, RETURN_TO_SUPPLIER

    @Column(name = "qty_in", nullable = false, columnDefinition = "DECIMAL(12,4) DEFAULT 0.0000")
    BigDecimal qtyIn;

    @Column(name = "qty_out", nullable = false, columnDefinition = "DECIMAL(12,4) DEFAULT 0.0000")
    BigDecimal qtyOut;

    @ManyToOne(optional = false)
    @JoinColumn(name = "unit_code", referencedColumnName = "code")
    Unit unit;

    @Column(name = "unit_price", nullable = false, columnDefinition = "DECIMAL(12,4) DEFAULT 0.0000")
    BigDecimal unitPrice;

    @Column(name = "line_total", nullable = false, columnDefinition = "DECIMAL(12,2) DEFAULT 0.00")
    BigDecimal lineTotal;

    @Column(name = "ref_type", nullable = false, length = 50)
    String refType;

    @Column(name = "ref_id", nullable = false, length = 100)
    String refId;

    @ManyToOne
    @JoinColumn(name = "ref_detail_id")
    GoodsReceiptDetail refDetail;

    @Column(name = "before_qty", nullable = false, columnDefinition = "DECIMAL(12,4) DEFAULT 0.0000")
    BigDecimal beforeQty;

    @Column(name = "after_qty", nullable = false, columnDefinition = "DECIMAL(12,4) DEFAULT 0.0000")
    BigDecimal afterQty;

    @Column(name = "conversion_factor")
    BigDecimal conversionFactor;

    @Column(name = "note")
    String note;

    @Column(name = "create_at", nullable = false, columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
    LocalDateTime createAt;
}


