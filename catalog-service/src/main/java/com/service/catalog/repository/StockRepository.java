package com.service.catalog.repository;

import com.service.catalog.entity.Stock;

import org.springframework.data.domain.Page;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Pageable;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface StockRepository extends JpaRepository<Stock, Integer> {
    
    /**
     * Tìm stock theo branch ID và ingredient ID
     */
    Optional<Stock> findByBranchIdAndIngredientIngredientId(Integer branchId, Integer ingredientId);
    
    /**
     * Tìm tất cả stocks theo branch ID
     */
    List<Stock> findByBranchId(Integer branchId);
    
    /**
     * Tìm tất cả stocks theo ingredient ID
     */
    List<Stock> findByIngredientIngredientId(Integer ingredientId);
    
    /**
     * Tìm stocks có tồn kho thấp
     */
    @Query("SELECT s FROM Stock s WHERE s.branchId = :branchId AND (s.quantity - s.reservedQuantity) <= s.threshold")
    List<Stock> findLowStockItems(@Param("branchId") Integer branchId);
    
    /**
     * Tìm stocks hết hàng
     */
    @Query("SELECT s FROM Stock s WHERE s.branchId = :branchId AND (s.quantity - s.reservedQuantity) <= 0")
    List<Stock> findOutOfStockItems(@Param("branchId") Integer branchId);
    
    /**
     * Tính tổng quantity available cho một ingredient tại branch
     */
    @Query("SELECT (s.quantity - s.reservedQuantity) FROM Stock s WHERE s.branchId = :branchId AND s.ingredient.ingredientId = :ingredientId")
    Optional<BigDecimal> getAvailableQuantity(@Param("branchId") Integer branchId, @Param("ingredientId") Integer ingredientId);
    
    /**
     * Tìm stocks theo ingredient IDs
     */
    @Query("SELECT s FROM Stock s WHERE s.branchId = :branchId AND s.ingredient.ingredientId IN :ingredientIds")
    List<Stock> findByBranchIdAndIngredientIdIn(@Param("branchId") Integer branchId, @Param("ingredientIds") List<Integer> ingredientIds);
    
    /**
     * Cập nhật reserved quantity
     */
    @Query("UPDATE Stock s SET s.reservedQuantity = s.reservedQuantity + :quantity WHERE s.branchId = :branchId AND s.ingredient.ingredientId = :ingredientId")
    int updateReservedQuantity(@Param("branchId") Integer branchId, @Param("ingredientId") Integer ingredientId, @Param("quantity") BigDecimal quantity);
    
    /**
     * Kiểm tra xem có đủ stock không
     */
    @Query("SELECT CASE WHEN (s.quantity - s.reservedQuantity) >= :requiredQuantity THEN true ELSE false END FROM Stock s WHERE s.branchId = :branchId AND s.ingredient.ingredientId = :ingredientId")
    Optional<Boolean> hasEnoughStock(@Param("branchId") Integer branchId, @Param("ingredientId") Integer ingredientId, @Param("requiredQuantity") BigDecimal requiredQuantity);
    
    /**
     * Tìm stocks cần nhập hàng (dưới threshold)
     */
    @Query("SELECT s FROM Stock s WHERE s.branchId = :branchId AND (s.quantity - s.reservedQuantity) <= s.threshold ORDER BY (s.quantity - s.reservedQuantity) ASC")
    List<Stock> findStocksNeedingRestock(@Param("branchId") Integer branchId);

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