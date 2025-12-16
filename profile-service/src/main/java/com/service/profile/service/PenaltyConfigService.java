package com.service.profile.service;

import com.service.profile.dto.request.PenaltyConfigCreationRequest;
import com.service.profile.dto.request.PenaltyConfigUpdateRequest;
import com.service.profile.dto.response.PenaltyConfigResponse;
import com.service.profile.entity.PenaltyConfig;
import com.service.profile.exception.AppException;
import com.service.profile.exception.ErrorCode;
import com.service.profile.mapper.PenaltyConfigMapper;
import com.service.profile.repository.PenaltyConfigRepository;
import com.service.profile.repository.PenaltyRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PenaltyConfigService {

    PenaltyConfigRepository penaltyConfigRepository;
    PenaltyConfigMapper penaltyConfigMapper;
    PenaltyRepository penaltyRepository;

    /**
     * Tạo penalty config (Admin only)
     */
    @Transactional
    public PenaltyConfigResponse createConfig(PenaltyConfigCreationRequest request, Integer adminUserId) {
        // Kiểm tra duplicate: penalty_type + branch_id phải unique
        Optional<PenaltyConfig> existing = penaltyConfigRepository
            .findByPenaltyTypeAndBranchId(request.getPenaltyType(), request.getBranchId());
        
        if (existing.isPresent()) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 
                "Penalty config already exists for penalty_type=" + request.getPenaltyType() + 
                " and branch_id=" + request.getBranchId());
        }
        
        PenaltyConfig config = penaltyConfigMapper.toEntity(request);
        config.setCreatedBy(adminUserId);
        config.setCreateAt(LocalDateTime.now());
        config.setUpdateAt(LocalDateTime.now());
        
        PenaltyConfig saved = penaltyConfigRepository.save(config);
        log.info("Created penalty config: configId={}, branchId={}, penaltyType={}", 
            saved.getConfigId(), saved.getBranchId(), saved.getPenaltyType());
        
        return penaltyConfigMapper.toResponse(saved);
    }

    /**
     * Cập nhật penalty config (Admin only)
     */
    @Transactional
    public PenaltyConfigResponse updateConfig(Integer configId, PenaltyConfigUpdateRequest request) {
        PenaltyConfig config = penaltyConfigRepository.findById(configId)
            .orElseThrow(() -> new AppException(ErrorCode.PENALTY_CONFIG_NOT_FOUND));
        
        penaltyConfigMapper.updateEntity(config, request);
        config.setUpdateAt(LocalDateTime.now());
        
        PenaltyConfig updated = penaltyConfigRepository.save(config);
        log.info("Updated penalty config: configId={}", configId);
        
        return penaltyConfigMapper.toResponse(updated);
    }

    /**
     * Xóa penalty config (Admin only)
     */
    @Transactional
    public void deleteConfig(Integer configId) {
        PenaltyConfig config = penaltyConfigRepository.findById(configId)
            .orElseThrow(() -> new AppException(ErrorCode.PENALTY_CONFIG_NOT_FOUND));
        
        penaltyConfigRepository.delete(config);
        log.info("Deleted penalty config: configId={}", configId);
    }

    /**
     * Lấy danh sách configs (có filter)
     * Admin: chỉ lấy SYSTEM configs (branchId = null) khi không truyền branchId
     * Manager: có thể filter theo branchId
     */
    public List<PenaltyConfigResponse> getConfigs(Integer branchId, Boolean isActive) {
        List<PenaltyConfig> configs;
        
        // Nếu branchId không được truyền (null), chỉ lấy SYSTEM configs (branchId = null trong DB)
        if (branchId == null) {
            if (isActive != null && isActive) {
                configs = penaltyConfigRepository.findByBranchIdIsNullAndIsActiveTrue();
            } else if (isActive != null && !isActive) {
                configs = penaltyConfigRepository.findByBranchIdIsNullAndIsActiveFalse();
            } else {
                configs = penaltyConfigRepository.findByBranchIdIsNull();
            }
        } else if (branchId != null && isActive != null) {
            configs = penaltyConfigRepository.findByBranchIdAndIsActive(branchId, isActive);
        } else if (branchId != null) {
            configs = penaltyConfigRepository.findByBranchIdAndIsActiveTrue(branchId);
        } else {
            configs = penaltyConfigRepository.findAll();
        }
        
        return configs.stream()
            .map(penaltyConfigMapper::toResponse)
            .collect(Collectors.toList());
    }

    /**
     * Lấy chi tiết config
     */
    public PenaltyConfigResponse getConfigById(Integer configId) {
        PenaltyConfig config = penaltyConfigRepository.findById(configId)
            .orElseThrow(() -> new AppException(ErrorCode.PENALTY_CONFIG_NOT_FOUND));
        
        PenaltyConfigResponse response = penaltyConfigMapper.toResponse(config);
        // Tính số lần config đã được sử dụng
        long usageCount = penaltyRepository.countBySourceTemplateId(configId);
        response.setUsageCount(usageCount);
        
        return response;
    }

    /**
     * Lấy configs cho Manager (SYSTEM + BRANCH của mình)
     */
    public List<PenaltyConfigResponse> getConfigsForManager(Integer managerBranchId) {
        List<PenaltyConfig> configs = penaltyConfigRepository
            .findConfigsForManager(managerBranchId);
        
        return configs.stream()
            .map(penaltyConfigMapper::toResponse)
            .collect(Collectors.toList());
    }

    /**
     * Lấy penalty config theo penalty_type (ưu tiên BRANCH, nếu không có thì SYSTEM)
     */
    public Optional<PenaltyConfig> getConfigByPenaltyType(String penaltyType, Integer branchId) {
        // Ưu tiên BRANCH config
        if (branchId != null) {
            Optional<PenaltyConfig> branchConfig = penaltyConfigRepository
                .findByPenaltyTypeAndBranchId(penaltyType, branchId);
            if (branchConfig.isPresent() && branchConfig.get().getIsActive()) {
                return branchConfig;
            }
        }
        
        // Nếu không có BRANCH config, lấy SYSTEM config
        Optional<PenaltyConfig> systemConfig = penaltyConfigRepository
            .findByPenaltyTypeAndBranchIdIsNull(penaltyType);
        
        if (systemConfig.isPresent() && systemConfig.get().getIsActive()) {
            return systemConfig;
        }
        
        return Optional.empty();
    }

    /**
     * Validate config access (Manager chỉ có thể dùng config của branch mình hoặc SYSTEM)
     */
    public void validateConfigAccess(Integer managerBranchId, PenaltyConfig config) {
        if (config.getBranchId() != null && !config.getBranchId().equals(managerBranchId)) {
            throw new AppException(ErrorCode.TEMPLATE_ACCESS_DENIED);
        }
    }

    /**
     * Cập nhật penalty config cho Manager (chỉ config của branch mình)
     */
    @Transactional
    public PenaltyConfigResponse updateConfigForManager(Integer configId, PenaltyConfigUpdateRequest request, Integer managerBranchId) {
        PenaltyConfig config = penaltyConfigRepository.findById(configId)
            .orElseThrow(() -> new AppException(ErrorCode.PENALTY_CONFIG_NOT_FOUND));
        
        // Validate: Manager chỉ có thể sửa config của branch mình (không phải SYSTEM)
        if (config.getBranchId() == null) {
            throw new AppException(ErrorCode.TEMPLATE_ACCESS_DENIED, "Cannot modify SYSTEM configs");
        }
        if (!config.getBranchId().equals(managerBranchId)) {
            throw new AppException(ErrorCode.TEMPLATE_ACCESS_DENIED, "Cannot modify configs from other branches");
        }
        
        // Check usage count để log warning
        long usageCount = penaltyRepository.countBySourceTemplateId(configId);
        if (usageCount > 0) {
            log.warn("Updating penalty config that has been used {} times. Changes only affect future records. configId={}, branchId={}", 
                usageCount, configId, managerBranchId);
        }
        
        penaltyConfigMapper.updateEntity(config, request);
        config.setUpdateAt(LocalDateTime.now());
        
        PenaltyConfig updated = penaltyConfigRepository.save(config);
        PenaltyConfigResponse response = penaltyConfigMapper.toResponse(updated);
        response.setUsageCount(usageCount);
        
        log.info("Updated penalty config by manager: configId={}, branchId={}, usageCount={}", 
            configId, managerBranchId, usageCount);
        
        return response;
    }

    /**
     * Soft delete penalty config cho Manager (set isActive = false)
     */
    @Transactional
    public void softDeleteConfigForManager(Integer configId, Integer managerBranchId) {
        PenaltyConfig config = penaltyConfigRepository.findById(configId)
            .orElseThrow(() -> new AppException(ErrorCode.PENALTY_CONFIG_NOT_FOUND));
        
        // Validate: Manager chỉ có thể xóa config của branch mình (không phải SYSTEM)
        if (config.getBranchId() == null) {
            throw new AppException(ErrorCode.TEMPLATE_ACCESS_DENIED, "Cannot delete SYSTEM configs");
        }
        if (!config.getBranchId().equals(managerBranchId)) {
            throw new AppException(ErrorCode.TEMPLATE_ACCESS_DENIED, "Cannot delete configs from other branches");
        }
        
        config.setIsActive(false);
        config.setUpdateAt(LocalDateTime.now());
        penaltyConfigRepository.save(config);
        log.info("Soft deleted penalty config by manager: configId={}, branchId={}", configId, managerBranchId);
    }
}

