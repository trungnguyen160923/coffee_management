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
@Table(name = "purchase_orders", uniqueConstraints = {
        @UniqueConstraint(name = "ux_po_number", columnNames = {"po_number"})
})
public class PurchaseOrder {


    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "po_id")
    Integer poId;


    @Column(name = "po_number", nullable = false, length = 100, unique = true)
    String poNumber;


    @ManyToOne
    @JoinColumn(name = "supplier_id", nullable = false)
    Supplier supplier;


    @Column(name = "branch_id")
    Integer branchId;


    @Column(nullable = false, length = 50)
    String status;


    @Column(name = "total_amount", nullable = false, columnDefinition = "DECIMAL(12,4) DEFAULT 0.0000")
    BigDecimal totalAmount;


	@Column(name = "expected_delivery_at")
	LocalDateTime expectedDeliveryAt;




	@Column(name = "sent_at")
	LocalDateTime sentAt;


	@Column(name = "confirmed_at")
	LocalDateTime confirmedAt;


	@Column(name = "supplier_response", columnDefinition = "TEXT")
	String supplierResponse;


    @Column(name = "create_at", nullable = false, updatable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
    LocalDateTime createAt;


    @Column(name = "update_at", nullable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
    LocalDateTime updateAt;


    @OneToMany(mappedBy = "purchaseOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    List<PurchaseOrderDetail> details = new ArrayList<>();
}
