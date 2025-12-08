package com.service.profile.repository;

import com.service.profile.entity.StaffAvailability;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StaffAvailabilityRepository extends JpaRepository<StaffAvailability, Integer> {

    List<StaffAvailability> findByStaffUserId(Integer staffUserId);
}


