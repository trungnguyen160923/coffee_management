package com.service.catalog.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "goods_receipts", uniqueConstraints = {
        @UniqueConstraint(name = "ux_grn_number", columnNames = {"grn_number"})
})
public class GoodsReceipt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "grn_id")
    Long grnId;

    @Column(name = "grn_number", nullable = false, length = 100, unique = true)
    String grnNumber;

    @ManyToOne
    @JoinColumn(name = "po_id", nullable = false)
    PurchaseOrder purchaseOrder;

    @ManyToOne
    @JoinColumn(name = "supplier_id", nullable = false)
    Supplier supplier;

    @Column(name = "branch_id", nullable = false)
    Integer branchId;

    @Column(name = "total_amount", nullable = false, columnDefinition = "DECIMAL(12,2) DEFAULT 0.00")
    BigDecimal totalAmount;

    @Column(name = "received_at", nullable = false)
    LocalDateTime receivedAt;

    @Column(name = "received_by", nullable = false)
    Integer receivedBy;

    @Column(name = "create_at", nullable = false, updatable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
    LocalDateTime createAt;

    @OneToMany(mappedBy = "goodsReceipt", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    List<GoodsReceiptDetail> details = new ArrayList<>();
}