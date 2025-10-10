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
@Table(name = "return_goods_details")
public class ReturnGoodsDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    Integer id;

    @ManyToOne
    @JoinColumn(name = "return_id", nullable = false)
    ReturnGoods returnGoods;

    @ManyToOne
    @JoinColumn(name = "ingredient_id", nullable = false)
    Ingredient ingredient;

    @ManyToOne
    @JoinColumn(name = "unit_code", nullable = false)
    Unit unit;

    @Column(name = "qty", nullable = false, columnDefinition = "DECIMAL(12,4) DEFAULT 0.0000")
    BigDecimal qty;

    @Column(name = "unit_price", nullable = false, columnDefinition = "DECIMAL(12,2) DEFAULT 0.00")
    BigDecimal unitPrice;

    @Column(name = "line_total", nullable = false, columnDefinition = "DECIMAL(12,2) DEFAULT 0.00")
    BigDecimal lineTotal;

    @Column(name = "return_reason", columnDefinition = "TEXT")
    String returnReason;

    @Column(name = "create_at", nullable = false, updatable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
    LocalDateTime createAt;

    @Column(name = "update_at", nullable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
    LocalDateTime updateAt;
}
