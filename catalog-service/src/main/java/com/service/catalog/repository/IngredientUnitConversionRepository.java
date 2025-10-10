package com.service.catalog.repository;

import com.service.catalog.entity.IngredientUnitConversion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IngredientUnitConversionRepository extends JpaRepository<IngredientUnitConversion, Long> {
    
    /**
     * Find conversion by ingredient ID and unit codes
     */
    Optional<IngredientUnitConversion> findByIngredientIdAndFromUnitCodeAndToUnitCode(
        Integer ingredientId, String fromUnitCode, String toUnitCode
    );

    /**
     * Find active conversion by ingredient ID and unit codes
     */
    Optional<IngredientUnitConversion> findByIngredientIdAndFromUnitCodeAndToUnitCodeAndIsActiveTrue(
        Integer ingredientId, String fromUnitCode, String toUnitCode
    );

    /**
     * Find active conversion by ingredient ID and unit codes with scope and branch filter
     */
    @Query("SELECT c FROM IngredientUnitConversion c WHERE " +
           "c.ingredientId = :ingredientId AND " +
           "c.fromUnitCode = :fromUnitCode AND " +
           "c.toUnitCode = :toUnitCode AND " +
           "c.isActive = true AND " +
           "(c.scope = 'GLOBAL' OR (c.scope = 'BRANCH' AND c.branchId = :branchId))")
    Optional<IngredientUnitConversion> findActiveConversionByIngredientAndUnitsAndScope(
        @Param("ingredientId") Integer ingredientId, 
        @Param("fromUnitCode") String fromUnitCode, 
        @Param("toUnitCode") String toUnitCode,
        @Param("branchId") Integer branchId
    );

    /**
     * Find active conversion through base unit with scope and branch filter
     */
    @Query("SELECT c FROM IngredientUnitConversion c WHERE " +
           "c.ingredientId = :ingredientId AND " +
           "c.fromUnitCode = :fromUnitCode AND " +
           "c.toUnitCode = :toUnitCode AND " +
           "c.isActive = true AND " +
           "(c.scope = 'GLOBAL' OR (c.scope = 'BRANCH' AND c.branchId = :branchId))")
    Optional<IngredientUnitConversion> findActiveBaseConversionByIngredientAndUnitsAndScope(
        @Param("ingredientId") Integer ingredientId, 
        @Param("fromUnitCode") String fromUnitCode, 
        @Param("toUnitCode") String toUnitCode,
        @Param("branchId") Integer branchId
    );
    
    /**
     * Find all conversions for a specific ingredient
     */
    List<IngredientUnitConversion> findByIngredientId(Integer ingredientId);
    
    /**
     * Find all conversions from a specific unit
     */
    List<IngredientUnitConversion> findByFromUnitCode(String fromUnitCode);
    
    /**
     * Find all conversions to a specific unit
     */
    List<IngredientUnitConversion> findByToUnitCode(String toUnitCode);
    
    /**
     * Find all GLOBAL conversions (for ADMIN)
     */
    List<IngredientUnitConversion> findByScope(IngredientUnitConversion.ConversionScope scope);
    
    /**
     * Find all conversions for a specific branch (for MANAGER/STAFF)
     */
    List<IngredientUnitConversion> findByBranchId(Integer branchId);
    
    /**
     * Find all conversions for a specific branch and scope
     */
    List<IngredientUnitConversion> findByBranchIdAndScope(Integer branchId, IngredientUnitConversion.ConversionScope scope);
    
    /**
     * Find all conversions for a specific ingredient and branch
     */
    List<IngredientUnitConversion> findByIngredientIdAndBranchId(Integer ingredientId, Integer branchId);
    
    /**
     * Find all conversions for a specific ingredient and scope
     */
    List<IngredientUnitConversion> findByIngredientIdAndScope(Integer ingredientId, IngredientUnitConversion.ConversionScope scope);
    
    /**
     * Find all conversions for a specific ingredient, branch and scope
     */
    List<IngredientUnitConversion> findByIngredientIdAndBranchIdAndScope(
        Integer ingredientId, Integer branchId, IngredientUnitConversion.ConversionScope scope
    );
    
    /**
     * Find all conversions for a specific ingredient with GLOBAL scope or specific branch
     * This is useful for MANAGER/STAFF to get both GLOBAL and branch-specific conversions
     */
    @Query("SELECT c FROM IngredientUnitConversion c WHERE c.ingredientId = :ingredientId " +
           "AND (c.scope = 'GLOBAL' OR (c.scope = 'BRANCH' AND c.branchId = :branchId))")
    List<IngredientUnitConversion> findByIngredientIdWithGlobalAndBranch(
        @Param("ingredientId") Integer ingredientId, 
        @Param("branchId") Integer branchId
    );
    
    /**
     * Find all conversions with GLOBAL scope or specific branch
     * This is useful for MANAGER/STAFF to get both GLOBAL and branch-specific conversions
     */
    @Query("SELECT c FROM IngredientUnitConversion c WHERE " +
           "c.scope = 'GLOBAL' OR (c.scope = 'BRANCH' AND c.branchId = :branchId)")
    List<IngredientUnitConversion> findByGlobalAndBranch(@Param("branchId") Integer branchId);

    boolean existsByIngredientIdAndFromUnitCodeAndToUnitCodeAndIdNot(
            Integer ingredientId, 
            String fromUnitCode, 
            String toUnitCode, 
            Long id
    );
}
