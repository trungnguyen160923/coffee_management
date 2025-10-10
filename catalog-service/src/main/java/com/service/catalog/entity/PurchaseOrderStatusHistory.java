package com.service.catalog.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "purchase_order_status_history")
public class PurchaseOrderStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "po_id")
    PurchaseOrder purchaseOrder;

    @Column(name = "from_status", nullable = false, length = 50)
    String fromStatus;

    @Column(name = "to_status", nullable = false, length = 50)
    String toStatus;

    @Column(name = "changed_at", nullable = false, columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
    LocalDateTime changedAt;

    @Column(name = "changed_by", length = 100)
    String changedBy;

    @Column(name = "note")
    String note;
}


