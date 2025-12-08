package com.service.profile.repository;

import com.service.profile.entity.ShiftTemplateRoleRequirement;
import com.service.profile.entity.ShiftTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShiftTemplateRoleRequirementRepository extends JpaRepository<ShiftTemplateRoleRequirement, Integer> {

    List<ShiftTemplateRoleRequirement> findByTemplate(ShiftTemplate template);
    
    List<ShiftTemplateRoleRequirement> findByTemplate_TemplateId(Integer templateId);
    
    void deleteByTemplate_TemplateId(Integer templateId);
}

