package com.service.profile.repository;

import com.service.profile.entity.Penalty;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PenaltyRepository extends JpaRepository<Penalty, Integer> {
    
    List<Penalty> findByShiftId(Integer shiftId);
    
    List<Penalty> findByShiftIdAndUserId(Integer shiftId, Integer userId);
    
    List<Penalty> findByUserId(Integer userId);
    
    // Tìm penalty theo user và period
    List<Penalty> findByUserIdAndPeriod(Integer userId, String period);
    
    // Tìm penalty theo user, period và status
    List<Penalty> findByUserIdAndPeriodAndStatus(
        Integer userId, 
        String period, 
        Penalty.PenaltyStatus status
    );
    
    // Tìm penalty theo branch và period
    List<Penalty> findByBranchIdAndPeriod(Integer branchId, String period);
    
    // Tìm penalty theo status
    List<Penalty> findByStatus(Penalty.PenaltyStatus status);
    
    // Tìm penalty theo branch và status
    List<Penalty> findByBranchIdAndStatus(Integer branchId, Penalty.PenaltyStatus status);
    
    // Tìm penalty theo shift_id (để tự động hủy khi sửa NO_SHOW)
    List<Penalty> findByShiftIdAndStatus(Integer shiftId, Penalty.PenaltyStatus status);
    
    // Tìm penalty tự động (created_by = 0) theo user, shift và status
    List<Penalty> findByUserIdAndShiftIdAndCreatedByAndStatus(
        Integer userId,
        Integer shiftId,
        Integer createdBy,
        Penalty.PenaltyStatus status
    );
    
    // Tìm penalty theo penalty_type
    List<Penalty> findByPenaltyType(Penalty.PenaltyType penaltyType);
    
    // Đếm số lượng penalty đã sử dụng config này
    long countBySourceTemplateId(Integer sourceTemplateId);
}

