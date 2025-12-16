package com.service.profile.service;

import com.service.profile.dto.request.AllowanceCreationRequest;
import com.service.profile.dto.request.ApplyTemplateRequest;
import com.service.profile.dto.response.AllowanceResponse;
import com.service.profile.entity.*;
import com.service.profile.exception.AppException;
import com.service.profile.exception.ErrorCode;
import com.service.profile.mapper.AllowanceMapper;
import com.service.profile.repository.*;
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
public class AllowanceService {

    AllowanceRepository allowanceRepository;
    AllowanceTemplateRepository allowanceTemplateRepository;
    StaffProfileRepository staffProfileRepository;
    ManagerProfileRepository managerProfileRepository;
    AllowanceMapper allowanceMapper;
    AllowanceTemplateService allowanceTemplateService;

    /**
     * Tạo allowance custom
     */
    @Transactional
    public AllowanceResponse createAllowance(AllowanceCreationRequest request, Integer currentUserId, String currentUserRole) {
        Integer branchId = getBranchIdForUser(request.getUserId());
        Allowance.UserRole userRole = determineUserRole(request.getUserId());
        
        validateAuthorization(currentUserId, currentUserRole, request.getUserId(), userRole, branchId);
        
        // Kiểm tra duplicate: không cho phép tạo duplicate allowance (same user, period, type, status = ACTIVE)
        List<Allowance> existing = allowanceRepository.findByUserIdAndPeriod(request.getUserId(), request.getPeriod());
        boolean duplicateExists = existing.stream()
                .anyMatch(a -> a.getAllowanceType() == Allowance.AllowanceType.valueOf(request.getAllowanceType()) &&
                              a.getStatus() == Allowance.AllowanceStatus.ACTIVE);
        
        if (duplicateExists) {
            throw new AppException(ErrorCode.DUPLICATE_ENTITY, 
                    "Allowance already exists for this user, period, and type");
        }
        
        Allowance allowance = Allowance.builder()
            .userId(request.getUserId())
            .userRole(userRole)
            .branchId(branchId)
            .period(request.getPeriod())
            .allowanceType(Allowance.AllowanceType.valueOf(request.getAllowanceType()))
            .amount(request.getAmount())
            .description(request.getDescription())
            .sourceTemplateId(null)
            .status(Allowance.AllowanceStatus.ACTIVE)
            .createAt(LocalDateTime.now())
            .updateAt(LocalDateTime.now())
            .build();
        
        Allowance saved = allowanceRepository.save(allowance);
        log.info("Created allowance: allowanceId={}, userId={}, period={}", saved.getAllowanceId(), saved.getUserId(), saved.getPeriod());
        
        return allowanceMapper.toAllowanceResponse(saved);
    }

    /**
     * Tạo allowance từ template
     */
    @Transactional
    public AllowanceResponse createAllowanceFromTemplate(ApplyTemplateRequest request, Integer currentUserId, String currentUserRole) {
        AllowanceTemplate template = allowanceTemplateRepository.findById(request.getTemplateId())
            .orElseThrow(() -> new AppException(ErrorCode.ALLOWANCE_TEMPLATE_NOT_FOUND));
        
        if ("MANAGER".equals(currentUserRole)) {
            Integer managerBranchId = getManagerBranchId(currentUserId);
            allowanceTemplateService.validateTemplateAccess(managerBranchId, template);
        }
        
        Integer branchId = getBranchIdForUser(request.getUserId());
        Allowance.UserRole userRole = determineUserRole(request.getUserId());
        
        validateAuthorization(currentUserId, currentUserRole, request.getUserId(), userRole, branchId);
        
        Allowance.AllowanceType allowanceType = Allowance.AllowanceType.valueOf(template.getAllowanceType().name());
        
        // Kiểm tra duplicate: không cho phép tạo duplicate allowance (same user, period, type, status = ACTIVE)
        List<Allowance> existing = allowanceRepository.findByUserIdAndPeriod(request.getUserId(), request.getPeriod());
        boolean duplicateExists = existing.stream()
                .anyMatch(a -> a.getAllowanceType() == allowanceType &&
                              a.getStatus() == Allowance.AllowanceStatus.ACTIVE);
        
        if (duplicateExists) {
            throw new AppException(ErrorCode.DUPLICATE_ENTITY, 
                    "Allowance already exists for this user, period, and type");
        }
        
        Allowance allowance = Allowance.builder()
            .userId(request.getUserId())
            .userRole(userRole)
            .branchId(branchId)
            .period(request.getPeriod())
            .allowanceType(allowanceType)
            .amount(request.getOverrideAmount() != null ? request.getOverrideAmount() : template.getAmount())
            .description(request.getOverrideDescription() != null ? request.getOverrideDescription() : template.getDescription())
            .sourceTemplateId(template.getTemplateId())
            .status(Allowance.AllowanceStatus.ACTIVE)
            .createAt(LocalDateTime.now())
            .updateAt(LocalDateTime.now())
            .build();
        
        Allowance saved = allowanceRepository.save(allowance);
        log.info("Created allowance from template: allowanceId={}, templateId={}, userId={}", 
            saved.getAllowanceId(), template.getTemplateId(), saved.getUserId());
        
        return allowanceMapper.toAllowanceResponse(saved);
    }

    /**
     * Cập nhật allowance
     */
    @Transactional
    public AllowanceResponse updateAllowance(Integer allowanceId, AllowanceCreationRequest request, Integer currentUserId, String currentUserRole) {
        Allowance allowance = allowanceRepository.findById(allowanceId)
            .orElseThrow(() -> new AppException(ErrorCode.ALLOWANCE_NOT_FOUND));
        
        validateAuthorization(currentUserId, currentUserRole, allowance.getUserId(), allowance.getUserRole(), allowance.getBranchId());
        
        if (request.getAllowanceType() != null) {
            allowance.setAllowanceType(Allowance.AllowanceType.valueOf(request.getAllowanceType()));
        }
        if (request.getAmount() != null) {
            allowance.setAmount(request.getAmount());
        }
        if (request.getDescription() != null) {
            allowance.setDescription(request.getDescription());
        }
        allowance.setUpdateAt(LocalDateTime.now());
        
        Allowance updated = allowanceRepository.save(allowance);
        log.info("Updated allowance: allowanceId={}", allowanceId);
        
        return allowanceMapper.toAllowanceResponse(updated);
    }

    /**
     * Lấy danh sách allowance
     */
    public List<AllowanceResponse> getAllowances(Integer userId, Integer branchId, String period, String status) {
        List<Allowance> allowances;
        
        if (userId != null && period != null && status != null) {
            allowances = allowanceRepository.findByUserIdAndPeriodAndStatus(
                userId, period, Allowance.AllowanceStatus.valueOf(status));
        } else if (userId != null && period != null) {
            allowances = allowanceRepository.findByUserIdAndPeriod(userId, period);
        } else if (branchId != null && period != null) {
            allowances = allowanceRepository.findByBranchIdAndPeriod(branchId, period);
        } else if (branchId != null && status != null) {
            allowances = allowanceRepository.findByBranchIdAndStatus(branchId, Allowance.AllowanceStatus.valueOf(status));
        } else if (status != null) {
            allowances = allowanceRepository.findByStatus(Allowance.AllowanceStatus.valueOf(status));
        } else {
            allowances = allowanceRepository.findAll();
        }
        
        return allowances.stream()
            .map(allowanceMapper::toAllowanceResponse)
            .collect(Collectors.toList());
    }

    /**
     * Lấy chi tiết allowance
     */
    public AllowanceResponse getAllowanceById(Integer allowanceId) {
        Allowance allowance = allowanceRepository.findById(allowanceId)
            .orElseThrow(() -> new AppException(ErrorCode.ALLOWANCE_NOT_FOUND));
        
        return allowanceMapper.toAllowanceResponse(allowance);
    }

    /**
     * Xóa allowance
     */
    @Transactional
    public void deleteAllowance(Integer allowanceId, Integer currentUserId, String currentUserRole) {
        Allowance allowance = allowanceRepository.findById(allowanceId)
            .orElseThrow(() -> new AppException(ErrorCode.ALLOWANCE_NOT_FOUND));
        
        validateAuthorization(currentUserId, currentUserRole, allowance.getUserId(), allowance.getUserRole(), allowance.getBranchId());
        
        allowanceRepository.delete(allowance);
        log.info("Deleted allowance: allowanceId={}", allowanceId);
    }

    private void validateAuthorization(Integer currentUserId, String currentUserRole, 
                                      Integer targetUserId, Allowance.UserRole targetUserRole, 
                                      Integer targetBranchId) {
        if ("ADMIN".equals(currentUserRole)) {
            return;
        }
        
        if ("MANAGER".equals(currentUserRole)) {
            if (targetUserRole != Allowance.UserRole.STAFF) {
                throw new AppException(ErrorCode.ACCESS_DENIED);
            }
            
            Integer managerBranchId = getManagerBranchId(currentUserId);
            if (!managerBranchId.equals(targetBranchId)) {
                throw new AppException(ErrorCode.ACCESS_DENIED);
            }
        } else {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }
    }

    private Integer getBranchIdForUser(Integer userId) {
        StaffProfile staffProfile = staffProfileRepository.findById(userId).orElse(null);
        if (staffProfile != null) {
            return staffProfile.getBranchId();
        }
        
        ManagerProfile managerProfile = managerProfileRepository.findById(userId).orElse(null);
        if (managerProfile != null) {
            return managerProfile.getBranchId();
        }
        
        throw new AppException(ErrorCode.USER_ID_NOT_FOUND);
    }

    private Allowance.UserRole determineUserRole(Integer userId) {
        if (staffProfileRepository.findById(userId).isPresent()) {
            return Allowance.UserRole.STAFF;
        } else if (managerProfileRepository.findById(userId).isPresent()) {
            return Allowance.UserRole.MANAGER;
        }
        throw new AppException(ErrorCode.USER_ID_NOT_FOUND);
    }

    private Integer getManagerBranchId(Integer managerUserId) {
        ManagerProfile managerProfile = managerProfileRepository.findById(managerUserId)
            .orElseThrow(() -> new AppException(ErrorCode.USER_ID_NOT_FOUND));
        return managerProfile.getBranchId();
    }
}

