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
@Table(name = "product_details", uniqueConstraints = {
        @UniqueConstraint(name = "uq_product_size", columnNames = {"product_id", "size_id"})
})
public class ProductDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "pd_id")
    Integer pdId;

    @ManyToOne
    @JoinColumn(name = "product_id", nullable = false)
    Product product;

    @ManyToOne
    @JoinColumn(name = "size_id", nullable = true)
    Size size;

    @Column(nullable = false, columnDefinition = "DECIMAL(12,2) DEFAULT 0.00")
    BigDecimal price;

    @Column(name = "create_at", nullable = false, updatable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
    LocalDateTime createAt;

    @Column(name = "update_at", nullable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
    LocalDateTime updateAt;

    @OneToMany(mappedBy = "productDetail", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    List<Recipe> recipes = new ArrayList<>();
}