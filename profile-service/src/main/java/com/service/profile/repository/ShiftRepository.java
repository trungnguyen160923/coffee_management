package com.service.profile.repository;

import com.service.profile.entity.Shift;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ShiftRepository extends JpaRepository<Shift, Integer> {

    List<Shift> findByBranchIdAndShiftDateBetween(Integer branchId, LocalDate start, LocalDate end);
    
    List<Shift> findByBranchIdAndShiftDateAndStatusNot(Integer branchId, LocalDate shiftDate, String status);
    
    List<Shift> findByBranchIdAndShiftDateBetweenAndStatus(Integer branchId, LocalDate start, LocalDate end, String status);
}


