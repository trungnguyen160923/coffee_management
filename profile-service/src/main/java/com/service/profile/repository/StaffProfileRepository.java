package com.service.profile.repository;

import com.service.profile.entity.StaffProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StaffProfileRepository extends JpaRepository<StaffProfile, Integer> {
    List<StaffProfile> findByBranchId(Integer branchId);
}
