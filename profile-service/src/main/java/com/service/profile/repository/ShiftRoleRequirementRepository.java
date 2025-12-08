package com.service.profile.repository;

import com.service.profile.entity.ShiftRoleRequirement;
import com.service.profile.entity.Shift;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShiftRoleRequirementRepository extends JpaRepository<ShiftRoleRequirement, Integer> {

    List<ShiftRoleRequirement> findByShift(Shift shift);
    
    void deleteByShift_ShiftId(Integer shiftId);
}


