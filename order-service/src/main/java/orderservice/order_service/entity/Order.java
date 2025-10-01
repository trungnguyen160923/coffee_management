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

    @Column(nullable = false)
    Integer customerId;

    @Column(nullable = false)
    Integer branchId;

    @Column(nullable = false)
    String status;

    @Column(nullable = false, precision = 10, scale = 2)
    BigDecimal totalAmount;

    @Column(columnDefinition = "TEXT")
    String notes;

    @Column(nullable = false)
    LocalDateTime orderDate;

    @Column(nullable = false)
    LocalDateTime createAt;

    @Column(nullable = false)
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
