package com.service.catalog.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "stock_reservations", 
       indexes = {
           @Index(name = "idx_stock_reservations_group_id", columnList = "reservation_group_id"),
           @Index(name = "idx_stock_reservations_expires", columnList = "expires_at"),
           @Index(name = "idx_stock_reservations_status", columnList = "status"),
           @Index(name = "idx_stock_reservations_branch_ingredient", columnList = "branch_id, ingredient_id"),
           @Index(name = "idx_stock_reservations_cart", columnList = "cart_id"),
           @Index(name = "idx_stock_reservations_guest", columnList = "guest_id"),
           @Index(name = "idx_stock_reservations_order", columnList = "order_id")
       },
       uniqueConstraints = {
           @UniqueConstraint(name = "uq_sr_group_ingredient", 
                            columnNames = {"reservation_group_id", "ingredient_id", "status"})
       })
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockReservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "reservation_id")
    private Long reservationId;

    @Column(name = "reservation_group_id", nullable = false, length = 50)
    private String reservationGroupId;

    @Column(name = "branch_id", nullable = false)
    private Integer branchId;

    @Column(name = "ingredient_id", nullable = false)
    private Integer ingredientId;

    @Column(name = "quantity_reserved", nullable = false, precision = 12, scale = 4)
    private BigDecimal quantityReserved;

    @Column(name = "unit_code", nullable = false, length = 20)
    private String unitCode;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "order_id")
    private Integer orderId;

    @Column(name = "cart_id")
    private Integer cartId;

    @Column(name = "guest_id", length = 50)
    private String guestId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private ReservationStatus status = ReservationStatus.ACTIVE;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // Relationships
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ingredient_id", insertable = false, updatable = false)
    private Ingredient ingredient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unit_code", insertable = false, updatable = false)
    private Unit unit;

    // Enum for reservation status
    public enum ReservationStatus {
        ACTIVE,     // Đang giữ chỗ
        COMMITTED,  // Đã commit (trừ kho thật)
        RELEASED    // Đã release (hoàn trả)
    }

    // Helper methods
    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }

    public boolean isActive() {
        return status == ReservationStatus.ACTIVE && !isExpired();
    }

    public boolean canBeCommitted() {
        return status == ReservationStatus.ACTIVE && !isExpired();
    }

    public boolean canBeReleased() {
        return status == ReservationStatus.ACTIVE;
    }
}
