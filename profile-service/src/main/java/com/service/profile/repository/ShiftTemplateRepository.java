package com.service.profile.repository;

import com.service.profile.entity.ShiftTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShiftTemplateRepository extends JpaRepository<ShiftTemplate, Integer> {

    List<ShiftTemplate> findByBranchIdAndIsActiveTrue(Integer branchId);

    List<ShiftTemplate> findByBranchId(Integer branchId);

    Optional<ShiftTemplate> findByBranchIdAndNameIgnoreCase(Integer branchId, String name);
}


