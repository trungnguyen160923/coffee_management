package orderservice.order_service.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "orders")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Integer orderId;

    @Column(nullable = false, name = "customer_id")
    Integer customerId;

    @Column(name = "customer_name", length = 50)
    String customerName;

    @Column(name = "phone", length = 20)
    String phone;

    @Column(name = "delivery_address", length = 255)
    String deliveryAddress;

    @Column(nullable = false, name = "branch_id")
    Integer branchId;

    @Column(name = "table_id")
    Integer tableId;

    @Column(name = "reservation_id")
    Integer reservationId;

    @Column(nullable = false)
    String status;

    @Column(name = "payment_method", length = 50)
    String paymentMethod;

    @Column(name = "payment_status", length = 50)
    String paymentStatus;

    @Column(name = "subtotal", nullable = false, precision = 12, scale = 2)
    BigDecimal subtotal;

    @Column(name = "discount", nullable = false, precision = 12, scale = 2)
    BigDecimal discount;

    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
    BigDecimal totalAmount;

    @Column(columnDefinition = "TEXT")
    String notes;

    @Column(name = "order_date", nullable = false)
    LocalDateTime orderDate;

    @Column(name = "create_at", nullable = false)
    LocalDateTime createAt;

    @Column(name = "update_at", nullable = false)
    LocalDateTime updateAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    List<OrderItem> orderItems;

    @PrePersist
    protected void onCreate() {
        createAt = LocalDateTime.now();
        updateAt = LocalDateTime.now();
        if (orderDate == null) {
            orderDate = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updateAt = LocalDateTime.now();
    }
}
