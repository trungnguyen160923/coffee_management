package com.service.catalog.repository;

import com.service.catalog.entity.Stock;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface StockRepository extends JpaRepository<Stock, Integer> {
    Optional<Stock> findByIngredientIngredientIdAndBranchId(Integer ingredientId, Integer branchId);
    
    @Query("SELECT s FROM Stock s " +
           "JOIN s.ingredient i " +
           "LEFT JOIN s.unit u " +
           "WHERE (:search IS NULL OR :search = '' OR " +
           "       LOWER(i.name) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:branchId IS NULL OR s.branchId = :branchId) " +
           "AND (:ingredientId IS NULL OR i.ingredientId = :ingredientId) " +
           "AND (:unitCode IS NULL OR u.code = :unitCode) " +
           "AND (:lowStock IS NULL OR :lowStock = false OR s.quantity <= s.threshold)")
    Page<Stock> findStocksWithFilters(
            @Param("search") String search,
            @Param("branchId") Integer branchId,
            @Param("ingredientId") Integer ingredientId,
            @Param("unitCode") String unitCode,
            @Param("lowStock") Boolean lowStock,
            Pageable pageable);
}


