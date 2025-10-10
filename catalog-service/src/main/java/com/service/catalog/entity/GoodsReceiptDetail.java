package com.service.catalog.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "goods_receipt_details")
public class GoodsReceiptDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    Long id;

    @ManyToOne
    @JoinColumn(name = "grn_id", nullable = false)
    GoodsReceipt goodsReceipt;

    @ManyToOne
    @JoinColumn(name = "po_id", nullable = false)
    PurchaseOrder purchaseOrder;

    @ManyToOne
    @JoinColumn(name = "po_detail_id", nullable = false)
    PurchaseOrderDetail purchaseOrderDetail;

    @ManyToOne
    @JoinColumn(name = "ingredient_id", nullable = false)
    Ingredient ingredient;

    @Column(name = "unit_code_input", nullable = false, length = 20)
    String unitCodeInput;

    @Column(name = "qty_input", nullable = false, columnDefinition = "DECIMAL(12,4) DEFAULT 0.0000")
    BigDecimal qtyInput;

    @Column(name = "conversion_factor", nullable = false, columnDefinition = "DECIMAL(18,8) DEFAULT 1.00000000")
    BigDecimal conversionFactor;

    @Column(name = "qty_base", nullable = false, columnDefinition = "DECIMAL(12,4) DEFAULT 0.0000")
    BigDecimal qtyBase;

    @Column(name = "unit_price", nullable = false, columnDefinition = "DECIMAL(12,4) DEFAULT 0.0000")
    BigDecimal unitPrice;

    @Column(name = "line_total", nullable = false, columnDefinition = "DECIMAL(12,2) DEFAULT 0.00")
    BigDecimal lineTotal;

    @Column(name = "lot_number", length = 100)
    String lotNumber;

    @Column(name = "mfg_date")
    LocalDate mfgDate;

    @Column(name = "exp_date")
    LocalDate expDate;

    @Column(name = "status", nullable = false, length = 20)
    String status; // OK, SHORT, OVER, DAMAGE

    @Column(name = "note", length = 255)
    String note;

    @Column(name = "create_at", nullable = false, updatable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
    LocalDateTime createAt;
}