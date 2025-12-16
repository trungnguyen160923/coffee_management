package com.service.profile.service;

import com.service.profile.dto.request.ApplyTemplateRequest;
import com.service.profile.dto.request.BonusCreationRequest;
import com.service.profile.dto.response.BonusResponse;
import com.service.profile.entity.*;
import com.service.profile.exception.AppException;
import com.service.profile.exception.ErrorCode;
import com.service.profile.mapper.BonusMapper;
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
public class BonusService {

    BonusRepository bonusRepository;
    BonusTemplateRepository bonusTemplateRepository;
    StaffProfileRepository staffProfileRepository;
    ManagerProfileRepository managerProfileRepository;
    BonusMapper bonusMapper;
    BonusTemplateService bonusTemplateService;

    /**
     * Tạo bonus custom (không dùng template)
     */
    @Transactional
    public BonusResponse createBonus(BonusCreationRequest request, Integer currentUserId, String currentUserRole) {
        // Validate user tồn tại và lấy branchId
        Integer branchId = getBranchIdForUser(request.getUserId());
        Bonus.UserRole userRole = determineUserRole(request.getUserId());
        
        // Validate authorization
        validateAuthorization(currentUserId, currentUserRole, request.getUserId(), userRole, branchId);
        
        // Tạo bonus
        Bonus bonus = Bonus.builder()
            .userId(request.getUserId())
            .userRole(userRole)
            .branchId(branchId)
            .period(request.getPeriod())
            .bonusType(Bonus.BonusType.valueOf(request.getBonusType()))
            .amount(request.getAmount())
            .description(request.getDescription())
            .criteriaRef(request.getCriteriaRef())
            .sourceTemplateId(null) // Custom, không dùng template
            .shiftId(request.getShiftId())
            .status(Bonus.BonusStatus.PENDING)
            .createdBy(currentUserId)
            .createAt(LocalDateTime.now())
            .updateAt(LocalDateTime.now())
            .build();
        
        Bonus saved = bonusRepository.save(bonus);
        log.info("Created bonus: bonusId={}, userId={}, period={}", saved.getBonusId(), saved.getUserId(), saved.getPeriod());
        
        return bonusMapper.toBonusResponse(saved);
    }

    /**
     * Tạo bonus từ template (Manager apply template)
     */
    @Transactional
    public BonusResponse createBonusFromTemplate(ApplyTemplateRequest request, Integer currentUserId, String currentUserRole) {
        // Lấy template
        BonusTemplate template = bonusTemplateRepository.findById(request.getTemplateId())
            .orElseThrow(() -> new AppException(ErrorCode.BONUS_TEMPLATE_NOT_FOUND));
        
        // Validate template access (Manager chỉ có thể dùng template của branch mình hoặc SYSTEM)
        if ("MANAGER".equals(currentUserRole)) {
            Integer managerBranchId = getManagerBranchId(currentUserId);
            bonusTemplateService.validateTemplateAccess(managerBranchId, template);
        }
        
        // Validate user tồn tại và lấy branchId
        Integer branchId = getBranchIdForUser(request.getUserId());
        Bonus.UserRole userRole = determineUserRole(request.getUserId());
        
        // Validate authorization
        validateAuthorization(currentUserId, currentUserRole, request.getUserId(), userRole, branchId);
        
        // Tạo bonus từ template (có thể override amount/description)
        // Map BonusTemplate.BonusType sang Bonus.BonusType
        Bonus.BonusType bonusType = Bonus.BonusType.valueOf(template.getBonusType().name());
        
        Bonus bonus = Bonus.builder()
            .userId(request.getUserId())
            .userRole(userRole)
            .branchId(branchId)
            .period(request.getPeriod())
            .bonusType(bonusType)
            .amount(request.getOverrideAmount() != null ? request.getOverrideAmount() : template.getAmount())
            .description(request.getOverrideDescription() != null ? request.getOverrideDescription() : template.getDescription())
            .criteriaRef(template.getCriteriaRef())
            .sourceTemplateId(template.getTemplateId()) // Track template được dùng
            .shiftId(request.getShiftId())
            .status(Bonus.BonusStatus.PENDING)
            .createdBy(currentUserId)
            .createAt(LocalDateTime.now())
            .updateAt(LocalDateTime.now())
            .build();
        
        Bonus saved = bonusRepository.save(bonus);
        log.info("Created bonus from template: bonusId={}, templateId={}, userId={}", 
            saved.getBonusId(), template.getTemplateId(), saved.getUserId());
        
        return bonusMapper.toBonusResponse(saved);
    }

    /**
     * Duyệt bonus
     */
    @Transactional
    public BonusResponse approveBonus(Integer bonusId, Integer currentUserId, String currentUserRole) {
        Bonus bonus = bonusRepository.findById(bonusId)
            .orElseThrow(() -> new AppException(ErrorCode.BONUS_NOT_FOUND));
        
        if (bonus.getStatus() != Bonus.BonusStatus.PENDING) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, "Bonus is not in PENDING status");
        }
        
        // Validate authorization
        validateAuthorization(currentUserId, currentUserRole, bonus.getUserId(), bonus.getUserRole(), bonus.getBranchId());
        
        bonus.setStatus(Bonus.BonusStatus.APPROVED);
        bonus.setApprovedBy(currentUserId);
        bonus.setApprovedAt(LocalDateTime.now());
        bonus.setUpdateAt(LocalDateTime.now());
        
        Bonus updated = bonusRepository.save(bonus);
        log.info("Approved bonus: bonusId={}", bonusId);
        
        return bonusMapper.toBonusResponse(updated);
    }

    /**
     * Từ chối bonus
     */
    @Transactional
    public BonusResponse rejectBonus(Integer bonusId, String rejectionReason, Integer currentUserId, String currentUserRole) {
        Bonus bonus = bonusRepository.findById(bonusId)
            .orElseThrow(() -> new AppException(ErrorCode.BONUS_NOT_FOUND));
        
        if (bonus.getStatus() != Bonus.BonusStatus.PENDING) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, "Bonus is not in PENDING status");
        }
        
        // Validate authorization
        validateAuthorization(currentUserId, currentUserRole, bonus.getUserId(), bonus.getUserRole(), bonus.getBranchId());
        
        bonus.setStatus(Bonus.BonusStatus.REJECTED);
        bonus.setApprovedBy(currentUserId);
        bonus.setApprovedAt(LocalDateTime.now());
        bonus.setRejectionReason(rejectionReason);
        bonus.setUpdateAt(LocalDateTime.now());
        
        Bonus updated = bonusRepository.save(bonus);
        log.info("Rejected bonus: bonusId={}, reason={}", bonusId, rejectionReason);
        
        return bonusMapper.toBonusResponse(updated);
    }

    /**
     * Lấy danh sách bonus (có filter)
     */
    public List<BonusResponse> getBonuses(Integer userId, Integer branchId, String period, String status) {
        List<Bonus> bonuses;
        
        if (userId != null && period != null && status != null) {
            bonuses = bonusRepository.findByUserIdAndPeriodAndStatus(
                userId, period, Bonus.BonusStatus.valueOf(status));
        } else if (userId != null && period != null) {
            bonuses = bonusRepository.findByUserIdAndPeriod(userId, period);
        } else if (branchId != null && period != null) {
            bonuses = bonusRepository.findByBranchIdAndPeriod(branchId, period);
        } else if (branchId != null && status != null) {
            bonuses = bonusRepository.findByBranchIdAndStatus(branchId, Bonus.BonusStatus.valueOf(status));
        } else if (status != null) {
            bonuses = bonusRepository.findByStatus(Bonus.BonusStatus.valueOf(status));
        } else {
            bonuses = bonusRepository.findAll();
        }
        
        return bonuses.stream()
            .map(bonusMapper::toBonusResponse)
            .collect(Collectors.toList());
    }

    public List<BonusResponse> getBonusesByShift(Integer shiftId, Integer userId) {
        if (shiftId == null && userId == null) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, "shiftId or userId is required");
        }
        List<Bonus> bonuses;
        if (shiftId != null && userId != null) {
            bonuses = bonusRepository.findByShiftIdAndUserId(shiftId, userId);
        } else if (shiftId != null) {
            bonuses = bonusRepository.findByShiftId(shiftId);
        } else {
            bonuses = bonusRepository.findByUserId(userId);
        }
        return bonuses.stream().map(bonusMapper::toBonusResponse).collect(Collectors.toList());
    }

    /**
     * Lấy chi tiết bonus
     */
    public BonusResponse getBonusById(Integer bonusId) {
        Bonus bonus = bonusRepository.findById(bonusId)
            .orElseThrow(() -> new AppException(ErrorCode.BONUS_NOT_FOUND));
        
        return bonusMapper.toBonusResponse(bonus);
    }

    /**
     * Cập nhật bonus (chỉ khi PENDING)
     */
    @Transactional
    public BonusResponse updateBonus(Integer bonusId, BonusCreationRequest request, Integer currentUserId, String currentUserRole) {
        Bonus bonus = bonusRepository.findById(bonusId)
            .orElseThrow(() -> new AppException(ErrorCode.BONUS_NOT_FOUND));

        if (bonus.getStatus() != Bonus.BonusStatus.PENDING) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, "Only PENDING bonuses can be updated");
        }

        // Không cho đổi user/branch/period bằng API update – giữ nguyên liên kết payroll
        validateAuthorization(currentUserId, currentUserRole, bonus.getUserId(), bonus.getUserRole(), bonus.getBranchId());

        // Cho phép đổi loại, số tiền, mô tả, criteriaRef, shift
        if (request.getBonusType() != null) {
            bonus.setBonusType(Bonus.BonusType.valueOf(request.getBonusType()));
        }
        if (request.getAmount() != null) {
            bonus.setAmount(request.getAmount());
        }
        if (request.getDescription() != null) {
            bonus.setDescription(request.getDescription());
        }
        if (request.getCriteriaRef() != null) {
            bonus.setCriteriaRef(request.getCriteriaRef());
        }
        bonus.setShiftId(request.getShiftId());
        bonus.setUpdateAt(LocalDateTime.now());

        Bonus updated = bonusRepository.save(bonus);
        log.info("Updated bonus: bonusId={}, userId={}, period={}", updated.getBonusId(), updated.getUserId(), updated.getPeriod());

        return bonusMapper.toBonusResponse(updated);
    }

    /**
     * Xóa bonus (chỉ khi PENDING)
     */
    @Transactional
    public void deleteBonus(Integer bonusId, Integer currentUserId, String currentUserRole) {
        Bonus bonus = bonusRepository.findById(bonusId)
            .orElseThrow(() -> new AppException(ErrorCode.BONUS_NOT_FOUND));
        
        if (bonus.getStatus() != Bonus.BonusStatus.PENDING) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, "Cannot delete bonus that is not in PENDING status");
        }
        
        // Validate authorization
        validateAuthorization(currentUserId, currentUserRole, bonus.getUserId(), bonus.getUserRole(), bonus.getBranchId());
        
        bonusRepository.delete(bonus);
        log.info("Deleted bonus: bonusId={}", bonusId);
    }

    /**
     * Validate authorization
     */
    private void validateAuthorization(Integer currentUserId, String currentUserRole, 
                                      Integer targetUserId, Bonus.UserRole targetUserRole, 
                                      Integer targetBranchId) {
        if ("ADMIN".equals(currentUserRole)) {
            return; // Admin có quyền tất cả
        }
        
        if ("MANAGER".equals(currentUserRole)) {
            // Manager chỉ quản lý Staff trong branch của mình
            if (targetUserRole != Bonus.UserRole.STAFF) {
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

    /**
     * Lấy branchId cho user
     */
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

    /**
     * Xác định UserRole
     */
    private Bonus.UserRole determineUserRole(Integer userId) {
        if (staffProfileRepository.findById(userId).isPresent()) {
            return Bonus.UserRole.STAFF;
        } else if (managerProfileRepository.findById(userId).isPresent()) {
            return Bonus.UserRole.MANAGER;
        }
        throw new AppException(ErrorCode.USER_ID_NOT_FOUND);
    }

    /**
     * Lấy branchId của Manager
     */
    private Integer getManagerBranchId(Integer managerUserId) {
        ManagerProfile managerProfile = managerProfileRepository.findById(managerUserId)
            .orElseThrow(() -> new AppException(ErrorCode.USER_ID_NOT_FOUND));
        return managerProfile.getBranchId();
    }
}

