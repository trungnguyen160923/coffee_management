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
@Table(name = "units")
public class Unit {

    @Id
    @Column(name = "code", length = 20)
    String code;

    @Column(nullable = false, length = 50)
    String name;

    @Column(nullable = false, length = 20)
    String dimension;

    @Column(name = "factor_to_base", nullable = false, columnDefinition = "DECIMAL(18,8)")
    BigDecimal factorToBase;

    @ManyToOne
    @JoinColumn(name = "base_unit_code", referencedColumnName = "code", nullable = false)
    Unit baseUnit;

    @Column(name = "create_at", nullable = false, updatable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
    LocalDateTime createAt;

    @Column(name = "update_at", nullable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
    LocalDateTime updateAt;

    // Self-referencing relationship for base units
    @OneToMany(mappedBy = "baseUnit", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    List<Unit> derivedUnits = new ArrayList<>();

    // Relationships with other entities
    @OneToMany(mappedBy = "unit", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    List<Ingredient> ingredients = new ArrayList<>();

    @OneToMany(mappedBy = "unit", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    List<RecipeItem> recipeItems = new ArrayList<>();

    @OneToMany(mappedBy = "unit", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    List<Stock> stocks = new ArrayList<>();

    @OneToMany(mappedBy = "unit", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    List<PurchaseOrderDetail> purchaseOrderDetails = new ArrayList<>();
}
