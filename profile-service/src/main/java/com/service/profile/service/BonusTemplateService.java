package com.service.profile.service;

import com.service.profile.dto.request.BonusTemplateCreationRequest;
import com.service.profile.dto.request.BonusTemplateUpdateRequest;
import com.service.profile.dto.response.BonusTemplateResponse;
import com.service.profile.entity.BonusTemplate;
import com.service.profile.exception.AppException;
import com.service.profile.exception.ErrorCode;
import com.service.profile.mapper.BonusTemplateMapper;
import com.service.profile.repository.BonusTemplateRepository;
import com.service.profile.repository.BonusRepository;
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
public class BonusTemplateService {

    BonusTemplateRepository bonusTemplateRepository;
    BonusTemplateMapper bonusTemplateMapper;
    BonusRepository bonusRepository;

    /**
     * Tạo bonus template (Admin only)
     */
    @Transactional
    public BonusTemplateResponse createTemplate(BonusTemplateCreationRequest request, Integer adminUserId) {
        BonusTemplate template = bonusTemplateMapper.toEntity(request);
        template.setCreatedBy(adminUserId);
        template.setCreateAt(LocalDateTime.now());
        template.setUpdateAt(LocalDateTime.now());
        
        BonusTemplate saved = bonusTemplateRepository.save(template);
        log.info("Created bonus template: templateId={}, branchId={}, name={}", 
            saved.getTemplateId(), saved.getBranchId(), saved.getName());
        
        return bonusTemplateMapper.toResponse(saved);
    }

    /**
     * Cập nhật bonus template (Admin only)
     */
    @Transactional
    public BonusTemplateResponse updateTemplate(Integer templateId, BonusTemplateUpdateRequest request) {
        BonusTemplate template = bonusTemplateRepository.findById(templateId)
            .orElseThrow(() -> new AppException(ErrorCode.BONUS_TEMPLATE_NOT_FOUND));
        
        bonusTemplateMapper.updateEntity(template, request);
        template.setUpdateAt(LocalDateTime.now());
        
        BonusTemplate updated = bonusTemplateRepository.save(template);
        log.info("Updated bonus template: templateId={}", templateId);
        
        return bonusTemplateMapper.toResponse(updated);
    }

    /**
     * Xóa bonus template (Admin only)
     */
    @Transactional
    public void deleteTemplate(Integer templateId) {
        BonusTemplate template = bonusTemplateRepository.findById(templateId)
            .orElseThrow(() -> new AppException(ErrorCode.BONUS_TEMPLATE_NOT_FOUND));
        
        bonusTemplateRepository.delete(template);
        log.info("Deleted bonus template: templateId={}", templateId);
    }

    /**
     * Lấy danh sách templates (có filter)
     * Admin: chỉ lấy SYSTEM templates (branchId = null) khi không truyền branchId
     * Manager: có thể filter theo branchId
     */
    public List<BonusTemplateResponse> getTemplates(Integer branchId, Boolean isActive) {
        List<BonusTemplate> templates;
        
        // Nếu branchId không được truyền (null), chỉ lấy SYSTEM templates (branchId = null trong DB)
        if (branchId == null) {
            if (isActive != null && isActive) {
                templates = bonusTemplateRepository.findByBranchIdIsNullAndIsActiveTrue();
            } else if (isActive != null && !isActive) {
                templates = bonusTemplateRepository.findByBranchIdIsNullAndIsActiveFalse();
            } else {
                templates = bonusTemplateRepository.findByBranchIdIsNull();
            }
        } else if (branchId != null && isActive != null) {
            templates = bonusTemplateRepository.findByBranchIdAndIsActive(branchId, isActive);
        } else if (branchId != null) {
            templates = bonusTemplateRepository.findByBranchIdAndIsActiveTrue(branchId);
        } else {
            templates = bonusTemplateRepository.findAll();
        }
        
        return templates.stream()
            .map(bonusTemplateMapper::toResponse)
            .collect(Collectors.toList());
    }

    /**
     * Lấy chi tiết template
     */
    public BonusTemplateResponse getTemplateById(Integer templateId) {
        BonusTemplate template = bonusTemplateRepository.findById(templateId)
            .orElseThrow(() -> new AppException(ErrorCode.BONUS_TEMPLATE_NOT_FOUND));
        
        BonusTemplateResponse response = bonusTemplateMapper.toResponse(template);
        // Tính số lần template đã được sử dụng
        long usageCount = bonusRepository.countBySourceTemplateId(templateId);
        response.setUsageCount(usageCount);
        
        return response;
    }

    /**
     * Lấy templates cho Manager (SYSTEM + BRANCH của mình)
     */
    public List<BonusTemplateResponse> getTemplatesForManager(Integer managerBranchId) {
        List<BonusTemplate> templates = bonusTemplateRepository
            .findTemplatesForManager(managerBranchId);
        
        return templates.stream()
            .map(bonusTemplateMapper::toResponse)
            .collect(Collectors.toList());
    }

    /**
     * Validate template access (Manager chỉ có thể dùng template của branch mình hoặc SYSTEM)
     */
    public void validateTemplateAccess(Integer managerBranchId, BonusTemplate template) {
        if (template.getBranchId() != null && !template.getBranchId().equals(managerBranchId)) {
            throw new AppException(ErrorCode.TEMPLATE_ACCESS_DENIED);
        }
    }

    /**
     * Cập nhật bonus template cho Manager (chỉ template của branch mình)
     */
    @Transactional
    public BonusTemplateResponse updateTemplateForManager(Integer templateId, BonusTemplateUpdateRequest request, Integer managerBranchId) {
        BonusTemplate template = bonusTemplateRepository.findById(templateId)
            .orElseThrow(() -> new AppException(ErrorCode.BONUS_TEMPLATE_NOT_FOUND));
        
        // Validate: Manager chỉ có thể sửa template của branch mình (không phải SYSTEM)
        if (template.getBranchId() == null) {
            throw new AppException(ErrorCode.TEMPLATE_ACCESS_DENIED, "Cannot modify SYSTEM templates");
        }
        if (!template.getBranchId().equals(managerBranchId)) {
            throw new AppException(ErrorCode.TEMPLATE_ACCESS_DENIED, "Cannot modify templates from other branches");
        }
        
        // Check usage count để log warning
        long usageCount = bonusRepository.countBySourceTemplateId(templateId);
        if (usageCount > 0) {
            log.warn("Updating bonus template that has been used {} times. Changes only affect future records. templateId={}, branchId={}", 
                usageCount, templateId, managerBranchId);
        }
        
        bonusTemplateMapper.updateEntity(template, request);
        template.setUpdateAt(LocalDateTime.now());
        
        BonusTemplate updated = bonusTemplateRepository.save(template);
        BonusTemplateResponse response = bonusTemplateMapper.toResponse(updated);
        response.setUsageCount(usageCount);
        
        log.info("Updated bonus template by manager: templateId={}, branchId={}, usageCount={}", 
            templateId, managerBranchId, usageCount);
        
        return response;
    }

    /**
     * Soft delete bonus template cho Manager (set isActive = false)
     */
    @Transactional
    public void softDeleteTemplateForManager(Integer templateId, Integer managerBranchId) {
        BonusTemplate template = bonusTemplateRepository.findById(templateId)
            .orElseThrow(() -> new AppException(ErrorCode.BONUS_TEMPLATE_NOT_FOUND));
        
        // Validate: Manager chỉ có thể xóa template của branch mình (không phải SYSTEM)
        if (template.getBranchId() == null) {
            throw new AppException(ErrorCode.TEMPLATE_ACCESS_DENIED, "Cannot delete SYSTEM templates");
        }
        if (!template.getBranchId().equals(managerBranchId)) {
            throw new AppException(ErrorCode.TEMPLATE_ACCESS_DENIED, "Cannot delete templates from other branches");
        }
        
        template.setIsActive(false);
        template.setUpdateAt(LocalDateTime.now());
        bonusTemplateRepository.save(template);
        log.info("Soft deleted bonus template by manager: templateId={}, branchId={}", templateId, managerBranchId);
    }
}

