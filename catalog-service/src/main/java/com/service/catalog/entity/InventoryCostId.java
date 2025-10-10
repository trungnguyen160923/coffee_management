package com.service.catalog.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Embeddable
@FieldDefaults(level = AccessLevel.PRIVATE)
public class InventoryCostId implements Serializable {
    @Column(name = "branch_id")
    Integer branchId;

    @Column(name = "ingredient_id")
    Integer ingredientId;
}


