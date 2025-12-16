package com.service.profile.repository;

import com.service.profile.entity.PenaltyConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PenaltyConfigRepository extends JpaRepository<PenaltyConfig, Integer> {
    
    // Lấy SYSTEM configs (branch_id = NULL)
    List<PenaltyConfig> findByBranchIdIsNullAndIsActiveTrue();
    List<PenaltyConfig> findByBranchIdIsNullAndIsActiveFalse();
    List<PenaltyConfig> findByBranchIdIsNull();
    
    // Lấy BRANCH configs (branch_id != NULL)
    List<PenaltyConfig> findByBranchIdAndIsActiveTrue(Integer branchId);
    
    // Lấy configs cho Manager (SYSTEM + BRANCH của mình)
    @Query("SELECT c FROM PenaltyConfig c WHERE (c.branchId = :branchId OR c.branchId IS NULL) AND c.isActive = TRUE")
    List<PenaltyConfig> findConfigsForManager(@Param("branchId") Integer branchId);
    
    // Lấy config theo penalty_type và branch_id
    Optional<PenaltyConfig> findByPenaltyTypeAndBranchId(String penaltyType, Integer branchId);
    
    // Lấy SYSTEM config theo penalty_type
    Optional<PenaltyConfig> findByPenaltyTypeAndBranchIdIsNull(String penaltyType);
    
    // Lấy tất cả configs (có filter)
    List<PenaltyConfig> findByBranchIdAndIsActive(Integer branchId, Boolean isActive);
    
    // Lấy config theo penalty_type (ưu tiên BRANCH, nếu không có thì SYSTEM)
    Optional<PenaltyConfig> findFirstByPenaltyTypeAndIsActiveTrueOrderByBranchIdDesc(String penaltyType);
}

