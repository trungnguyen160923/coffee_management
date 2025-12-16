package com.service.profile.repository;

import com.service.profile.entity.Bonus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BonusRepository extends JpaRepository<Bonus, Integer> {
    
    List<Bonus> findByShiftId(Integer shiftId);
    
    List<Bonus> findByShiftIdAndUserId(Integer shiftId, Integer userId);
    
    List<Bonus> findByUserId(Integer userId);
    
    // Tìm bonus theo user và period
    List<Bonus> findByUserIdAndPeriod(Integer userId, String period);
    
    // Tìm bonus theo user, period và status
    List<Bonus> findByUserIdAndPeriodAndStatus(
        Integer userId, 
        String period, 
        Bonus.BonusStatus status
    );
    
    // Tìm bonus theo branch và period
    List<Bonus> findByBranchIdAndPeriod(Integer branchId, String period);
    
    // Tìm bonus theo status
    List<Bonus> findByStatus(Bonus.BonusStatus status);
    
    // Tìm bonus theo branch và status
    List<Bonus> findByBranchIdAndStatus(Integer branchId, Bonus.BonusStatus status);
    
    // Đếm số lượng bonus đã sử dụng template này
    long countBySourceTemplateId(Integer sourceTemplateId);
}

