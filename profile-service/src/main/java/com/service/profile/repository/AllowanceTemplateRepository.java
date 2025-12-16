package com.service.profile.repository;

import com.service.profile.entity.AllowanceTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AllowanceTemplateRepository extends JpaRepository<AllowanceTemplate, Integer> {
    
    // Lấy SYSTEM templates (branch_id = NULL)
    List<AllowanceTemplate> findByBranchIdIsNullAndIsActiveTrue();
    List<AllowanceTemplate> findByBranchIdIsNullAndIsActiveFalse();
    List<AllowanceTemplate> findByBranchIdIsNull();
    
    // Lấy BRANCH templates (branch_id != NULL)
    List<AllowanceTemplate> findByBranchIdAndIsActiveTrue(Integer branchId);
    
    // Lấy templates cho Manager (SYSTEM + BRANCH của mình)
    // Query: (branch_id = ? OR branch_id IS NULL) AND is_active = TRUE
    @Query("SELECT t FROM AllowanceTemplate t WHERE (t.branchId = :branchId OR t.branchId IS NULL) AND t.isActive = TRUE")
    List<AllowanceTemplate> findTemplatesForManager(@Param("branchId") Integer branchId);
    
    // Lấy tất cả templates (có filter)
    List<AllowanceTemplate> findByBranchIdAndIsActive(Integer branchId, Boolean isActive);
    
    // Lấy templates theo allowance_type
    List<AllowanceTemplate> findByAllowanceTypeAndIsActiveTrue(AllowanceTemplate.AllowanceType allowanceType);
    
    // Lấy templates theo branch và allowance_type
    List<AllowanceTemplate> findByBranchIdAndAllowanceTypeAndIsActiveTrue(
        Integer branchId, 
        AllowanceTemplate.AllowanceType allowanceType
    );
}

