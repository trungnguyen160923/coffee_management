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
@Table(name = "suppliers")
public class Supplier {


    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "supplier_id")
    Integer supplierId;


    @Column(nullable = false, length = 150)
    String name;


    @Column(name = "contact_name", length = 150)
    String contactName;


    @Column(length = 20)
    String phone;


    @Column(length = 100)
    String email;


    @Column(length = 255)
    String address;

    @Column(length = 255)
    String note;


    @Column(name = "create_at", nullable = false, updatable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
    LocalDateTime createAt;


    @Column(name = "update_at", nullable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
    LocalDateTime updateAt;


    @OneToMany(mappedBy = "supplier", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    List<Ingredient> ingredients = new ArrayList<>();


    @OneToMany(mappedBy = "supplier", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    List<PurchaseOrder> purchaseOrders = new ArrayList<>();
}
