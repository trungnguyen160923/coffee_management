package com.service.profile.repository;

import com.service.profile.entity.Allowance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AllowanceRepository extends JpaRepository<Allowance, Integer> {
    
    // Tìm allowance theo user và period
    List<Allowance> findByUserIdAndPeriod(Integer userId, String period);
    
    // Tìm allowance theo user, period và status
    List<Allowance> findByUserIdAndPeriodAndStatus(
        Integer userId, 
        String period, 
        Allowance.AllowanceStatus status
    );
    
    // Tìm allowance theo branch và period
    List<Allowance> findByBranchIdAndPeriod(Integer branchId, String period);
    
    // Tìm allowance theo status
    List<Allowance> findByStatus(Allowance.AllowanceStatus status);
    
    // Tìm allowance theo branch và status
    List<Allowance> findByBranchIdAndStatus(Integer branchId, Allowance.AllowanceStatus status);
    
    // Đếm số lượng allowance đã sử dụng template này
    long countBySourceTemplateId(Integer sourceTemplateId);
}

