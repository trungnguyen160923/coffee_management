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
@Table(name = "recipes")
public class Recipe {


    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "recipe_id")
    Integer recipeId;

    @Column(name = "name", nullable = false, length = 150)
    String name;

    @ManyToOne
    @JoinColumn(name = "pd_id", nullable = true)
    ProductDetail productDetail;

    @Column(nullable = false)
    Integer version;


    @Column(columnDefinition = "TEXT")
    String description;


    @Column(name = "yield", columnDefinition = "DECIMAL(12,4) DEFAULT 1.0000")
    BigDecimal yield;

    @Column(name = "instructions", nullable = false, columnDefinition = "TEXT")
    String instructions;

    @Column(name = "status", nullable = false, length = 50)
    String status;

    @Column(name = "create_at", nullable = false, updatable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
    LocalDateTime createAt;


    @Column(name = "update_at", nullable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
    LocalDateTime updateAt;


    @OneToMany(mappedBy = "recipe", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    List<RecipeItem> items = new ArrayList<>();
}