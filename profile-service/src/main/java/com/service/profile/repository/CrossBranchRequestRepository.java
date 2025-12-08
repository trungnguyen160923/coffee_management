package com.service.profile.repository;

import com.service.profile.entity.CrossBranchRequest;
import com.service.profile.entity.Shift;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CrossBranchRequestRepository extends JpaRepository<CrossBranchRequest, Integer> {

    List<CrossBranchRequest> findByFromBranchId(Integer fromBranchId);

    List<CrossBranchRequest> findByToBranchId(Integer toBranchId);

    List<CrossBranchRequest> findByShift(Shift shift);
}


