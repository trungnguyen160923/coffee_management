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
@Table(name = "return_goods", uniqueConstraints = {
        @UniqueConstraint(name = "ux_return_number", columnNames = {"return_number"})
})
public class ReturnGoods {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "return_id")
    Integer returnId;

    @Column(name = "return_number", nullable = false, length = 100, unique = true)
    String returnNumber;

    @ManyToOne
    @JoinColumn(name = "po_id", nullable = false)
    PurchaseOrder purchaseOrder;

    @ManyToOne
    @JoinColumn(name = "supplier_id", nullable = false)
    Supplier supplier;

    @Column(name = "branch_id")
    Integer branchId;

    @Column(name = "received_by", nullable = false)
    Integer receivedBy;

    @Column(nullable = false, length = 50)
    String status; // PENDING, APPROVED, RETURNED, REJECTED

    @Column(name = "total_amount", nullable = false, columnDefinition = "DECIMAL(12,4) DEFAULT 0.0000")
    BigDecimal totalAmount;

    @Column(name = "return_reason", columnDefinition = "TEXT")
    String returnReason;

    @Column(name = "approved_at")
    LocalDateTime approvedAt;

    @Column(name = "returned_at")
    LocalDateTime returnedAt;

    @Column(name = "create_at", nullable = false, updatable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
    LocalDateTime createAt;

    @Column(name = "update_at", nullable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
    LocalDateTime updateAt;

    @OneToMany(mappedBy = "returnGoods", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    List<ReturnGoodsDetail> details = new ArrayList<>();
}
