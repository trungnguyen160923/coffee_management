package com.service.profile.service;

import com.service.profile.dto.request.AllowanceTemplateCreationRequest;
import com.service.profile.dto.request.AllowanceTemplateUpdateRequest;
import com.service.profile.dto.response.AllowanceTemplateResponse;
import com.service.profile.entity.AllowanceTemplate;
import com.service.profile.exception.AppException;
import com.service.profile.exception.ErrorCode;
import com.service.profile.mapper.AllowanceTemplateMapper;
import com.service.profile.repository.AllowanceTemplateRepository;
import com.service.profile.repository.AllowanceRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AllowanceTemplateService {

    AllowanceTemplateRepository allowanceTemplateRepository;
    AllowanceTemplateMapper allowanceTemplateMapper;
    AllowanceRepository allowanceRepository;

    /**
     * Tạo allowance template (Admin only)
     */
    @Transactional
    public AllowanceTemplateResponse createTemplate(AllowanceTemplateCreationRequest request, Integer adminUserId) {
        AllowanceTemplate template = allowanceTemplateMapper.toEntity(request);
        template.setCreatedBy(adminUserId);
        template.setCreateAt(LocalDateTime.now());
        template.setUpdateAt(LocalDateTime.now());
        
        AllowanceTemplate saved = allowanceTemplateRepository.save(template);
        log.info("Created allowance template: templateId={}, branchId={}, name={}", 
            saved.getTemplateId(), saved.getBranchId(), saved.getName());
        
        return allowanceTemplateMapper.toResponse(saved);
    }

    /**
     * Cập nhật allowance template (Admin only)
     */
    @Transactional
    public AllowanceTemplateResponse updateTemplate(Integer templateId, AllowanceTemplateUpdateRequest request) {
        AllowanceTemplate template = allowanceTemplateRepository.findById(templateId)
            .orElseThrow(() -> new AppException(ErrorCode.ALLOWANCE_TEMPLATE_NOT_FOUND));
        
        allowanceTemplateMapper.updateEntity(template, request);
        template.setUpdateAt(LocalDateTime.now());
        
        AllowanceTemplate updated = allowanceTemplateRepository.save(template);
        log.info("Updated allowance template: templateId={}", templateId);
        
        return allowanceTemplateMapper.toResponse(updated);
    }

    /**
     * Xóa allowance template (Admin only)
     */
    @Transactional
    public void deleteTemplate(Integer templateId) {
        AllowanceTemplate template = allowanceTemplateRepository.findById(templateId)
            .orElseThrow(() -> new AppException(ErrorCode.ALLOWANCE_TEMPLATE_NOT_FOUND));
        
        allowanceTemplateRepository.delete(template);
        log.info("Deleted allowance template: templateId={}", templateId);
    }

    /**
     * Lấy danh sách templates (có filter)
     * Admin: chỉ lấy SYSTEM templates (branchId = null) khi không truyền branchId
     * Manager: có thể filter theo branchId
     */
    public List<AllowanceTemplateResponse> getTemplates(Integer branchId, Boolean isActive) {
        List<AllowanceTemplate> templates;
        
        // Nếu branchId không được truyền (null), chỉ lấy SYSTEM templates (branchId = null trong DB)
        if (branchId == null) {
            if (isActive != null && isActive) {
                templates = allowanceTemplateRepository.findByBranchIdIsNullAndIsActiveTrue();
            } else if (isActive != null && !isActive) {
                templates = allowanceTemplateRepository.findByBranchIdIsNullAndIsActiveFalse();
            } else {
                templates = allowanceTemplateRepository.findByBranchIdIsNull();
            }
        } else if (branchId != null && isActive != null) {
            templates = allowanceTemplateRepository.findByBranchIdAndIsActive(branchId, isActive);
        } else if (branchId != null) {
            templates = allowanceTemplateRepository.findByBranchIdAndIsActiveTrue(branchId);
        } else {
            templates = allowanceTemplateRepository.findAll();
        }
        
        return templates.stream()
            .map(allowanceTemplateMapper::toResponse)
            .collect(Collectors.toList());
    }

    /**
     * Lấy chi tiết template
     */
    public AllowanceTemplateResponse getTemplateById(Integer templateId) {
        AllowanceTemplate template = allowanceTemplateRepository.findById(templateId)
            .orElseThrow(() -> new AppException(ErrorCode.ALLOWANCE_TEMPLATE_NOT_FOUND));
        
        AllowanceTemplateResponse response = allowanceTemplateMapper.toResponse(template);
        // Tính số lần template đã được sử dụng
        long usageCount = allowanceRepository.countBySourceTemplateId(templateId);
        response.setUsageCount(usageCount);
        
        return response;
    }

    /**
     * Lấy templates cho Manager (SYSTEM + BRANCH của mình)
     */
    public List<AllowanceTemplateResponse> getTemplatesForManager(Integer managerBranchId) {
        List<AllowanceTemplate> templates = allowanceTemplateRepository
            .findTemplatesForManager(managerBranchId);
        
        return templates.stream()
            .map(allowanceTemplateMapper::toResponse)
            .collect(Collectors.toList());
    }

    /**
     * Validate template access (Manager chỉ có thể dùng template của branch mình hoặc SYSTEM)
     */
    public void validateTemplateAccess(Integer managerBranchId, AllowanceTemplate template) {
        if (template.getBranchId() != null && !template.getBranchId().equals(managerBranchId)) {
            throw new AppException(ErrorCode.TEMPLATE_ACCESS_DENIED);
        }
    }

    /**
     * Cập nhật allowance template cho Manager (chỉ template của branch mình)
     */
    @Transactional
    public AllowanceTemplateResponse updateTemplateForManager(Integer templateId, AllowanceTemplateUpdateRequest request, Integer managerBranchId) {
        AllowanceTemplate template = allowanceTemplateRepository.findById(templateId)
            .orElseThrow(() -> new AppException(ErrorCode.ALLOWANCE_TEMPLATE_NOT_FOUND));
        
        // Validate: Manager chỉ có thể sửa template của branch mình (không phải SYSTEM)
        if (template.getBranchId() == null) {
            throw new AppException(ErrorCode.TEMPLATE_ACCESS_DENIED, "Cannot modify SYSTEM templates");
        }
        if (!template.getBranchId().equals(managerBranchId)) {
            throw new AppException(ErrorCode.TEMPLATE_ACCESS_DENIED, "Cannot modify templates from other branches");
        }
        
        // Check usage count để log warning
        long usageCount = allowanceRepository.countBySourceTemplateId(templateId);
        if (usageCount > 0) {
            log.warn("Updating allowance template that has been used {} times. Changes only affect future records. templateId={}, branchId={}", 
                usageCount, templateId, managerBranchId);
        }
        
        allowanceTemplateMapper.updateEntity(template, request);
        template.setUpdateAt(LocalDateTime.now());
        
        AllowanceTemplate updated = allowanceTemplateRepository.save(template);
        AllowanceTemplateResponse response = allowanceTemplateMapper.toResponse(updated);
        response.setUsageCount(usageCount);
        
        log.info("Updated allowance template by manager: templateId={}, branchId={}, usageCount={}", 
            templateId, managerBranchId, usageCount);
        
        return response;
    }

    /**
     * Soft delete allowance template cho Manager (set isActive = false)
     */
    @Transactional
    public void softDeleteTemplateForManager(Integer templateId, Integer managerBranchId) {
        AllowanceTemplate template = allowanceTemplateRepository.findById(templateId)
            .orElseThrow(() -> new AppException(ErrorCode.ALLOWANCE_TEMPLATE_NOT_FOUND));
        
        // Validate: Manager chỉ có thể xóa template của branch mình (không phải SYSTEM)
        if (template.getBranchId() == null) {
            throw new AppException(ErrorCode.TEMPLATE_ACCESS_DENIED, "Cannot delete SYSTEM templates");
        }
        if (!template.getBranchId().equals(managerBranchId)) {
            throw new AppException(ErrorCode.TEMPLATE_ACCESS_DENIED, "Cannot delete templates from other branches");
        }
        
        template.setIsActive(false);
        template.setUpdateAt(LocalDateTime.now());
        allowanceTemplateRepository.save(template);
        log.info("Soft deleted allowance template by manager: templateId={}, branchId={}", templateId, managerBranchId);
    }
}

