package com.service.profile.repository;

import com.service.profile.entity.Shift;
import com.service.profile.entity.ShiftAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ShiftAssignmentRepository extends JpaRepository<ShiftAssignment, Integer> {

    List<ShiftAssignment> findByShift(Shift shift);

    List<ShiftAssignment> findByStaffUserIdAndStatusIn(Integer staffUserId, List<String> statuses);

    List<ShiftAssignment> findByStaffUserIdAndCheckedOutAtBetween(
            Integer staffUserId,
            LocalDateTime from,
            LocalDateTime to
    );

    List<ShiftAssignment> findByStaffUserIdAndShift_ShiftDateBetween(
            Integer staffUserId,
            LocalDate startDate,
            LocalDate endDate
    );

    boolean existsByShiftAndStaffUserIdAndStatusNot(
            Shift shift,
            Integer staffUserId,
            String status
    );

    // Find assignments with specific statuses for cleanup job
    List<ShiftAssignment> findByStatusIn(List<String> statuses);
}


