package com.service.profile.repository;

import com.service.profile.entity.StaffRoleAssignment;
import com.service.profile.entity.StaffProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StaffRoleAssignmentRepository extends JpaRepository<StaffRoleAssignment, Integer> {

    List<StaffRoleAssignment> findByStaffProfile(StaffProfile staffProfile);

    void deleteByStaffProfile(StaffProfile staffProfile);

    @Modifying
    @Query("DELETE FROM StaffRoleAssignment s WHERE s.staffProfile.userId = :userId")
    void deleteByStaffUserId(@Param("userId") Integer userId);
}


