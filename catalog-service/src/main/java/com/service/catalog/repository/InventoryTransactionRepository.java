package com.service.catalog.repository;

import com.service.catalog.entity.InventoryTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface InventoryTransactionRepository extends JpaRepository<InventoryTransaction, Long> {
    List<InventoryTransaction> findByBranchIdAndIngredientIngredientId(Integer branchId, Integer ingredientId);
    List<InventoryTransaction> findByRefTypeAndRefId(String refType, String refId);
    List<InventoryTransaction> findByTxnType(String txnType);
    
    /**
     * Tìm transactions theo branch và khoảng thời gian
     */
    @Query("SELECT t FROM InventoryTransaction t WHERE t.branchId = :branchId " +
           "AND DATE(t.createAt) BETWEEN :startDate AND :endDate ORDER BY t.createAt ASC")
    List<InventoryTransaction> findByBranchIdAndDateRange(
            @Param("branchId") Integer branchId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);
    
    /**
     * Tìm transactions theo branch và ngày cụ thể
     */
    @Query("SELECT t FROM InventoryTransaction t WHERE t.branchId = :branchId " +
           "AND DATE(t.createAt) = :date ORDER BY t.createAt ASC")
    List<InventoryTransaction> findByBranchIdAndDate(
            @Param("branchId") Integer branchId,
            @Param("date") LocalDate date);
}
