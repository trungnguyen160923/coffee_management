package com.service.catalog.repository;

import com.service.catalog.entity.InventoryTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InventoryTransactionRepository extends JpaRepository<InventoryTransaction, Long> {
    List<InventoryTransaction> findByBranchIdAndIngredientIngredientId(Integer branchId, Integer ingredientId);
    List<InventoryTransaction> findByRefTypeAndRefId(String refType, String refId);
    List<InventoryTransaction> findByTxnType(String txnType);
}
