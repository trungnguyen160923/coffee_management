package com.service.profile.service;

import com.service.profile.dto.request.PayrollConfigurationCreationRequest;
import com.service.profile.dto.request.PayrollConfigurationUpdateRequest;
import com.service.profile.dto.response.PayrollConfigurationResponse;
import com.service.profile.entity.PayrollConfiguration;
import com.service.profile.exception.AppException;
import com.service.profile.exception.ErrorCode;
import com.service.profile.mapper.PayrollConfigurationMapper;
import com.service.profile.repository.PayrollConfigurationRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PayrollConfigurationService {

    PayrollConfigurationRepository payrollConfigurationRepository;
    PayrollConfigurationMapper payrollConfigurationMapper;

    /**
     * Lấy tất cả cấu hình (chỉ active)
     */
    public List<PayrollConfigurationResponse> getAllConfigs() {
        List<PayrollConfiguration> configs = payrollConfigurationRepository.findByIsActiveTrue();
        return configs.stream()
            .map(payrollConfigurationMapper::toResponse)
            .collect(Collectors.toList());
    }

    /**
     * Lấy tất cả cấu hình (bao gồm cả inactive)
     */
    @PreAuthorize("hasRole('ADMIN')")
    public List<PayrollConfigurationResponse> getAllConfigsIncludingInactive() {
        List<PayrollConfiguration> configs = payrollConfigurationRepository.findAll();
        return configs.stream()
            .map(payrollConfigurationMapper::toResponse)
            .collect(Collectors.toList());
    }

    /**
     * Lấy cấu hình theo key
     */
    public PayrollConfigurationResponse getConfigByKey(String configKey) {
        PayrollConfiguration config = payrollConfigurationRepository.findByConfigKey(configKey)
            .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_FAILED, 
                "Configuration not found for key: " + configKey));
        return payrollConfigurationMapper.toResponse(config);
    }

    /**
     * Lấy giá trị cấu hình (helper method)
     */
    public BigDecimal getConfigValue(String configKey) {
        PayrollConfiguration config = payrollConfigurationRepository.findByConfigKey(configKey)
            .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_FAILED, 
                "Configuration not found for key: " + configKey));
        
        if (!config.getIsActive()) {
            log.warn("Configuration {} is inactive, using value anyway", configKey);
        }
        
        return config.getConfigValue();
    }

    /**
     * Cập nhật cấu hình (Admin only)
     */
    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public PayrollConfigurationResponse updateConfig(String configKey, 
                                                      PayrollConfigurationUpdateRequest request, 
                                                      Integer adminUserId) {
        PayrollConfiguration config = payrollConfigurationRepository.findByConfigKey(configKey)
            .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_FAILED, 
                "Configuration not found for key: " + configKey));

        // Validate giá trị mới với min/max (sử dụng min/max mới nếu có, nếu không thì dùng min/max cũ)
        BigDecimal minValueToCheck = request.getMinValue() != null ? request.getMinValue() : config.getMinValue();
        BigDecimal maxValueToCheck = request.getMaxValue() != null ? request.getMaxValue() : config.getMaxValue();
        
        if (request.getConfigValue() != null) {
            // Kiểm tra min nếu có
            if (minValueToCheck != null && request.getConfigValue().compareTo(minValueToCheck) < 0) {
                throw new AppException(ErrorCode.VALIDATION_FAILED, 
                    String.format("Config value must be >= %s", minValueToCheck));
            }
            // Kiểm tra max nếu có
            if (maxValueToCheck != null && request.getConfigValue().compareTo(maxValueToCheck) > 0) {
                throw new AppException(ErrorCode.VALIDATION_FAILED, 
                    String.format("Config value must be <= %s", maxValueToCheck));
            }
        }
        
        // Validate min/max: min phải <= max nếu cả hai đều có
        if (request.getMinValue() != null && request.getMaxValue() != null) {
            if (request.getMinValue().compareTo(request.getMaxValue()) > 0) {
                throw new AppException(ErrorCode.VALIDATION_FAILED, 
                    "Min value must be <= Max value");
            }
        }

        payrollConfigurationMapper.updateEntity(config, request);
        config.setUpdatedBy(adminUserId);
        config.setUpdateAt(LocalDateTime.now());
        
        PayrollConfiguration updated = payrollConfigurationRepository.save(config);
        log.info("Updated payroll configuration: configKey={}, updatedBy={}", configKey, adminUserId);
        
        return payrollConfigurationMapper.toResponse(updated);
    }

    /**
     * Cập nhật nhiều cấu hình cùng lúc (Admin only)
     */
    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public List<PayrollConfigurationResponse> updateConfigsBatch(
            java.util.Map<String, PayrollConfigurationUpdateRequest> updates, 
            Integer adminUserId) {
        List<PayrollConfigurationResponse> results = new java.util.ArrayList<>();
        
        for (java.util.Map.Entry<String, PayrollConfigurationUpdateRequest> entry : updates.entrySet()) {
            try {
                PayrollConfigurationResponse updated = updateConfig(entry.getKey(), entry.getValue(), adminUserId);
                results.add(updated);
            } catch (Exception e) {
                log.error("Failed to update config {}: {}", entry.getKey(), e.getMessage());
                // Continue with next config
            }
        }
        
        log.info("Updated {} payroll configurations", results.size());
        return results;
    }

    /**
     * Tạo cấu hình mới (Admin only)
     */
    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public PayrollConfigurationResponse createConfig(PayrollConfigurationCreationRequest request, 
                                                      Integer adminUserId) {
        // Kiểm tra config key đã tồn tại chưa
        if (payrollConfigurationRepository.existsByConfigKey(request.getConfigKey())) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 
                "Configuration with key '" + request.getConfigKey() + "' already exists");
        }

        // Validate giá trị với min/max nếu có
        if (request.getMinValue() != null && request.getConfigValue().compareTo(request.getMinValue()) < 0) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 
                String.format("Config value must be >= %s", request.getMinValue()));
        }
        if (request.getMaxValue() != null && request.getConfigValue().compareTo(request.getMaxValue()) > 0) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 
                String.format("Config value must be <= %s", request.getMaxValue()));
        }

        PayrollConfiguration config = PayrollConfiguration.builder()
            .configKey(request.getConfigKey())
            .configValue(request.getConfigValue())
            .configType(request.getConfigType())
            .displayName(request.getDisplayName())
            .description(request.getDescription())
            .unit(request.getUnit())
            .minValue(request.getMinValue())
            .maxValue(request.getMaxValue())
            .isActive(request.getIsActive() != null ? request.getIsActive() : true)
            .updatedBy(adminUserId)
            .createAt(LocalDateTime.now())
            .updateAt(LocalDateTime.now())
            .build();

        PayrollConfiguration saved = payrollConfigurationRepository.save(config);
        log.info("Created payroll configuration: configKey={}, createdBy={}", 
            request.getConfigKey(), adminUserId);
        
        return payrollConfigurationMapper.toResponse(saved);
    }

    /**
     * Xóa cấu hình (soft delete - set is_active = false) (Admin only)
     * Tất cả configs đều chỉ bị disable, không xóa khỏi DB để giữ lại lịch sử
     */
    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteConfig(String configKey, Integer adminUserId) {
        PayrollConfiguration config = payrollConfigurationRepository.findByConfigKey(configKey)
            .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_FAILED, 
                "Configuration not found for key: " + configKey));

        // Danh sách các config quan trọng (để hiển thị cảnh báo)
        java.util.Set<String> criticalConfigs = java.util.Set.of(
            "insurance_rate", "personal_deduction", "dependent_deduction",
            "default_overtime_rate", "weekend_overtime_multiplier", "holiday_overtime_multiplier",
            "max_daily_hours", "standard_working_days_per_month", "standard_working_hours_per_day",
            "tax_bracket_1_rate", "tax_bracket_1_max", "tax_bracket_2_rate", "tax_bracket_2_max",
            "tax_bracket_3_rate", "tax_bracket_3_max", "tax_bracket_4_rate", "tax_bracket_4_max",
            "tax_bracket_5_rate", "tax_bracket_5_max", "tax_bracket_6_rate", "tax_bracket_6_max",
            "tax_bracket_7_rate"
        );

        // Tất cả configs đều chỉ bị disable (soft delete), không xóa khỏi DB
        config.setIsActive(false);
        config.setUpdatedBy(adminUserId);
        config.setUpdateAt(LocalDateTime.now());
        payrollConfigurationRepository.save(config);
        
        if (criticalConfigs.contains(configKey)) {
            log.warn("Critical config {} was disabled by admin {}", configKey, adminUserId);
        } else {
            log.info("Configuration {} was disabled by admin {}", configKey, adminUserId);
        }
    }
}

