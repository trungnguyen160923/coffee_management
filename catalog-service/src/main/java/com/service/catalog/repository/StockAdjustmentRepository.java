package com.service.catalog.repository;

import com.service.catalog.entity.StockAdjustment;
import com.service.catalog.entity.StockAdjustment.AdjustmentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface StockAdjustmentRepository extends JpaRepository<StockAdjustment, Long> {

    @Query("SELECT sa FROM StockAdjustment sa " +
            "WHERE (:branchId IS NULL OR sa.branchId = :branchId) " +
            "AND (:date IS NULL OR sa.adjustmentDate = :date) " +
            "AND (:status IS NULL OR sa.status = :status) " +
            "ORDER BY sa.createdAt DESC")
    Page<StockAdjustment> searchAdjustments(@Param("branchId") Integer branchId,
                                            @Param("date") LocalDate adjustmentDate,
                                            @Param("status") AdjustmentStatus status,
                                            Pageable pageable);

    List<StockAdjustment> findByBranchIdAndAdjustmentDateAndStatus(Integer branchId,
                                                                   LocalDate adjustmentDate,
                                                                   AdjustmentStatus status);

    List<StockAdjustment> findByBranchIdAndAdjustmentDate(Integer branchId, LocalDate adjustmentDate);

    List<StockAdjustment> findByStatus(AdjustmentStatus status);

    @Query("SELECT DISTINCT sa.branchId FROM StockAdjustment sa WHERE sa.status = 'PENDING'")
    List<Integer> findBranchIdsWithPendingAdjustments();

    List<StockAdjustment> findByBranchIdAndStatus(Integer branchId, AdjustmentStatus status);

    java.util.Optional<StockAdjustment> findByBranchIdAndIngredientIngredientIdAndAdjustmentDate(Integer branchId,
                                                                                                Integer ingredientId,
                                                                                                LocalDate adjustmentDate);

    @Query("SELECT sa FROM StockAdjustment sa " +
            "WHERE sa.branchId = :branchId " +
            "AND sa.adjustmentDate = :date " +
            "AND sa.ingredient.ingredientId IN :ingredientIds")
    List<StockAdjustment> findByBranchIdAndDateAndIngredientIds(@Param("branchId") Integer branchId,
                                                                 @Param("date") LocalDate date,
                                                                 @Param("ingredientIds") List<Integer> ingredientIds);
}

