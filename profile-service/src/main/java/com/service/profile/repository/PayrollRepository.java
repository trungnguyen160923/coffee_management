package com.service.profile.repository;

import com.service.profile.entity.Payroll;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PayrollRepository extends JpaRepository<Payroll, Integer> {
    
    // Tìm payroll theo user_id và period
    Optional<Payroll> findByUserIdAndPeriod(Integer userId, String period);
    
    // Tìm tất cả payroll của một user
    List<Payroll> findByUserIdOrderByPeriodDesc(Integer userId);
    
    // Tìm payroll theo branch và period
    List<Payroll> findByBranchIdAndPeriod(Integer branchId, String period);
    
    // Tìm payroll theo branch, period và role
    List<Payroll> findByBranchIdAndPeriodAndUserRole(
        Integer branchId, 
        String period, 
        Payroll.UserRole userRole
    );
    
    // Tìm payroll theo status
    List<Payroll> findByStatus(Payroll.PayrollStatus status);
    
    // Tìm payroll theo branch và status
    List<Payroll> findByBranchIdAndStatus(Integer branchId, Payroll.PayrollStatus status);
    
    // Tìm payroll theo branch
    List<Payroll> findByBranchIdOrderByPeriodDesc(Integer branchId);
    
    // Tìm payroll theo user, period và status
    List<Payroll> findByUserIdAndPeriodAndStatus(
        Integer userId, 
        String period, 
        Payroll.PayrollStatus status
    );
    
    // Kiểm tra payroll đã tồn tại chưa
    boolean existsByUserIdAndPeriod(Integer userId, String period);
    
    // Tìm payroll theo period
    List<Payroll> findByPeriodOrderByUserId(String period);
}

