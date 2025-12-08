package com.service.profile.repository;

import com.service.profile.entity.ShiftRequest;
import com.service.profile.entity.ShiftAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShiftRequestRepository extends JpaRepository<ShiftRequest, Integer> {

    List<ShiftRequest> findByStaffUserId(Integer staffUserId);

    List<ShiftRequest> findByAssignment(ShiftAssignment assignment);
    
    List<ShiftRequest> findByStatus(String status);
    
    Optional<ShiftRequest> findByRequestIdAndStaffUserId(Integer requestId, Integer staffUserId);
    
    List<ShiftRequest> findByTargetStaffUserIdAndStatus(Integer targetStaffUserId, String status);
    
    // Get all requests sent to a user (all statuses)
    List<ShiftRequest> findByTargetStaffUserId(Integer targetStaffUserId);
    
    // New methods for conflict resolution
    List<ShiftRequest> findByTargetStaffUserIdAndAssignmentAndStatusIn(
            Integer targetStaffUserId, ShiftAssignment assignment, List<String> statuses);
    
    List<ShiftRequest> findByStaffUserIdAndAssignmentAndStatusIn(
            Integer staffUserId, ShiftAssignment assignment, List<String> statuses);
    
    List<ShiftRequest> findByStaffUserIdAndTargetStaffUserIdAndStatusIn(
            Integer staffUserId, Integer targetStaffUserId, List<String> statuses);
    
    List<ShiftRequest> findByAssignmentAndStatusIn(ShiftAssignment assignment, List<String> statuses);
    
    // Get requests by branch ID (through assignment -> shift -> branch)
    @Query("SELECT DISTINCT sr FROM ShiftRequest sr " +
           "JOIN FETCH sr.assignment sa " +
           "JOIN FETCH sa.shift s " +
           "WHERE s.branchId = :branchId")
    List<ShiftRequest> findByBranchId(@Param("branchId") Integer branchId);
    
    // Get requests by branch ID that need manager approval
    @Query("SELECT DISTINCT sr FROM ShiftRequest sr " +
           "JOIN FETCH sr.assignment sa " +
           "JOIN FETCH sa.shift s " +
           "WHERE s.branchId = :branchId " +
           "AND sr.status IN ('PENDING', 'PENDING_MANAGER_APPROVAL')")
    List<ShiftRequest> findByBranchIdAndStatusPendingManager(@Param("branchId") Integer branchId);
}


