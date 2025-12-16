package com.service.profile.repository;

import com.service.profile.entity.BonusTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BonusTemplateRepository extends JpaRepository<BonusTemplate, Integer> {
    
    // Lấy SYSTEM templates (branch_id = NULL)
    List<BonusTemplate> findByBranchIdIsNullAndIsActiveTrue();
    List<BonusTemplate> findByBranchIdIsNullAndIsActiveFalse();
    List<BonusTemplate> findByBranchIdIsNull();
    
    // Lấy BRANCH templates (branch_id != NULL)
    List<BonusTemplate> findByBranchIdAndIsActiveTrue(Integer branchId);
    
    // Lấy templates cho Manager (SYSTEM + BRANCH của mình)
    @Query("SELECT t FROM BonusTemplate t WHERE (t.branchId = :branchId OR t.branchId IS NULL) AND t.isActive = TRUE")
    List<BonusTemplate> findTemplatesForManager(@Param("branchId") Integer branchId);
    
    // Lấy tất cả templates (có filter)
    List<BonusTemplate> findByBranchIdAndIsActive(Integer branchId, Boolean isActive);
    
    // Lấy templates theo bonus_type
    List<BonusTemplate> findByBonusTypeAndIsActiveTrue(BonusTemplate.BonusType bonusType);
    
    // Lấy templates theo branch và bonus_type
    List<BonusTemplate> findByBranchIdAndBonusTypeAndIsActiveTrue(
        Integer branchId, 
        BonusTemplate.BonusType bonusType
    );
}

