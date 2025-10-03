package com.service.catalog.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.service.catalog.entity.Ingredient;

@Repository
public interface IngredientRepository extends JpaRepository<Ingredient, Integer> {
    @Query("SELECT i FROM Ingredient i " +
           "LEFT JOIN i.supplier s " +
           "WHERE (:search IS NULL OR LOWER(i.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "   OR LOWER(i.unit) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "   OR LOWER(CAST(i.unitPrice AS string)) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:supplierId IS NULL OR s.supplierId = :supplierId)")
    Page<Ingredient> findIngredientsWithFilters(
            @Param("search") String search,
            @Param("supplierId") Integer supplierId,
            Pageable pageable);
}
