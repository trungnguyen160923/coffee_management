package com.service.catalog.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

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
@Table(name = "products")
public class Product {


    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "product_id")
    Integer productId;


    @Column(nullable = false, length = 150)
    String name;

    @Column(name = "image_url", length = 255)
    String imageUrl;


    @ManyToOne
    @JoinColumn(name = "category_id")
    Category category;


    @Column(length = 100)
    String sku;


    @Column(columnDefinition = "TEXT")
    String description;

    @Column(nullable = false, columnDefinition = "TINYINT(1) DEFAULT 1")
    Boolean active;


    @Column(name = "create_at", nullable = false, updatable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
    LocalDateTime createAt;


    @Column(name = "update_at", nullable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
    LocalDateTime updateAt;


    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    List<ProductDetail> productDetails = new ArrayList<>();


}