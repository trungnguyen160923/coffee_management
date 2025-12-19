package com.service.profile.service;

import com.service.profile.dto.request.ApplyTemplateRequest;
import com.service.profile.dto.request.PenaltyCreationRequest;
import com.service.profile.dto.response.PenaltyResponse;
import com.service.profile.entity.*;
import com.service.profile.exception.AppException;
import com.service.profile.exception.ErrorCode;
import com.service.profile.mapper.PenaltyMapper;
import com.service.profile.repository.*;
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
public class PenaltyService {

    PenaltyRepository penaltyRepository;
    PenaltyConfigRepository penaltyConfigRepository;
    StaffProfileRepository staffProfileRepository;
    ManagerProfileRepository managerProfileRepository;
    PenaltyMapper penaltyMapper;
    PenaltyConfigService penaltyConfigService;

    /**
     * Tạo penalty custom
     */
    @Transactional
    public PenaltyResponse createPenalty(PenaltyCreationRequest request, Integer currentUserId, String currentUserRole) {
        Integer branchId = getBranchIdForUser(request.getUserId());
        Penalty.UserRole userRole = determineUserRole(request.getUserId());
        
        validateAuthorization(currentUserId, currentUserRole, request.getUserId(), userRole, branchId);
        
        Penalty penalty = Penalty.builder()
            .userId(request.getUserId())
            .userRole(userRole)
            .branchId(branchId)
            .period(request.getPeriod())
            .penaltyType(Penalty.PenaltyType.valueOf(request.getPenaltyType()))
            .amount(request.getAmount())
            .reasonCode(request.getReasonCode())
            .description(request.getDescription())
            .incidentDate(request.getIncidentDate())
            .shiftId(request.getShiftId())
            .sourceTemplateId(null)
            .status(Penalty.PenaltyStatus.PENDING)
            .createdBy(currentUserId)
            .createAt(LocalDateTime.now())
            .updateAt(LocalDateTime.now())
            .build();
        
        Penalty saved = penaltyRepository.save(penalty);
        log.info("Created penalty: penaltyId={}, userId={}, period={}", saved.getPenaltyId(), saved.getUserId(), saved.getPeriod());
        
        return penaltyMapper.toPenaltyResponse(saved);
    }

    /**
     * Tạo penalty từ template/penalty_config
     */
    @Transactional
    public PenaltyResponse createPenaltyFromTemplate(ApplyTemplateRequest request, Integer currentUserId, String currentUserRole) {
        // Lấy penalty config (template)
        PenaltyConfig config = penaltyConfigRepository.findById(request.getTemplateId())
            .orElseThrow(() -> new AppException(ErrorCode.PENALTY_CONFIG_NOT_FOUND));
        
        // Validate template access
        if ("MANAGER".equals(currentUserRole)) {
            Integer managerBranchId = getManagerBranchId(currentUserId);
            penaltyConfigService.validateConfigAccess(managerBranchId, config);
        }
        
        Integer branchId = getBranchIdForUser(request.getUserId());
        Penalty.UserRole userRole = determineUserRole(request.getUserId());
        
        validateAuthorization(currentUserId, currentUserRole, request.getUserId(), userRole, branchId);
        
        // Map penalty_type string sang Penalty.PenaltyType enum
        Penalty.PenaltyType penaltyType;
        try {
            penaltyType = Penalty.PenaltyType.valueOf(config.getPenaltyType());
        } catch (IllegalArgumentException e) {
            // Nếu không match, dùng OTHER
            penaltyType = Penalty.PenaltyType.OTHER;
        }
        
        Penalty penalty = Penalty.builder()
            .userId(request.getUserId())
            .userRole(userRole)
            .branchId(branchId)
            .period(request.getPeriod())
            .penaltyType(penaltyType)
            .amount(request.getOverrideAmount() != null ? request.getOverrideAmount() : config.getAmount())
            .description(request.getOverrideDescription() != null ? request.getOverrideDescription() : config.getDescription())
            .sourceTemplateId(config.getConfigId())
            .shiftId(request.getShiftId())
            .incidentDate(request.getIncidentDate())
            .status(Penalty.PenaltyStatus.PENDING)
            .createdBy(currentUserId)
            .createAt(LocalDateTime.now())
            .updateAt(LocalDateTime.now())
            .build();
        
        Penalty saved = penaltyRepository.save(penalty);
        log.info("Created penalty from template: penaltyId={}, configId={}, userId={}", 
            saved.getPenaltyId(), config.getConfigId(), saved.getUserId());
        
        return penaltyMapper.toPenaltyResponse(saved);
    }

    /**
     * Tạo penalty tự động khi NO_SHOW (event-driven)
     */
    @Transactional
    public PenaltyResponse createAutoPenalty(Integer userId, Integer shiftId, String period, Integer branchId) {
        // Lấy penalty config cho NO_SHOW (ưu tiên BRANCH, nếu không có thì SYSTEM)
        PenaltyConfig config = penaltyConfigService.getConfigByPenaltyType("NO_SHOW", branchId)
            .orElseThrow(() -> new AppException(ErrorCode.PENALTY_CONFIG_NOT_FOUND, 
                "Penalty config for NO_SHOW not found"));
        
        Penalty.UserRole userRole = determineUserRole(userId);
        
        Penalty.PenaltyType penaltyType;
        try {
            penaltyType = Penalty.PenaltyType.valueOf(config.getPenaltyType());
        } catch (IllegalArgumentException e) {
            penaltyType = Penalty.PenaltyType.NO_SHOW;
        }
        
        Penalty penalty = Penalty.builder()
            .userId(userId)
            .userRole(userRole)
            .branchId(branchId)
            .period(period)
            .penaltyType(penaltyType)
            .amount(config.getAmount())
            .description(config.getDescription())
            .shiftId(shiftId)
            .sourceTemplateId(config.getConfigId())
            .status(Penalty.PenaltyStatus.PENDING)
            .createdBy(0) // System tự động
            .createAt(LocalDateTime.now())
            .updateAt(LocalDateTime.now())
            .build();
        
        Penalty saved = penaltyRepository.save(penalty);
        log.info("Created auto penalty for NO_SHOW: penaltyId={}, userId={}, shiftId={}", 
            saved.getPenaltyId(), userId, shiftId);
        
        return penaltyMapper.toPenaltyResponse(saved);
    }

    /**
     * Hủy penalty tự động khi sửa NO_SHOW → COMPLETED
     */
    @Transactional
    public void cancelAutoPenalty(Integer userId, Integer shiftId) {
        List<Penalty> autoPenalties = penaltyRepository.findByUserIdAndShiftIdAndCreatedByAndStatus(
            userId, shiftId, 0, Penalty.PenaltyStatus.PENDING);
        
        for (Penalty penalty : autoPenalties) {
            penaltyRepository.delete(penalty);
            log.info("Cancelled auto penalty: penaltyId={}, userId={}, shiftId={}", 
                penalty.getPenaltyId(), userId, shiftId);
        }
    }

    /**
     * Duyệt penalty
     */
    @Transactional
    public PenaltyResponse approvePenalty(Integer penaltyId, Integer currentUserId, String currentUserRole) {
        Penalty penalty = penaltyRepository.findById(penaltyId)
            .orElseThrow(() -> new AppException(ErrorCode.PENALTY_NOT_FOUND));
        
        if (penalty.getStatus() != Penalty.PenaltyStatus.PENDING) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, "Penalty is not in PENDING status");
        }
        
        validateAuthorization(currentUserId, currentUserRole, penalty.getUserId(), penalty.getUserRole(), penalty.getBranchId());
        
        penalty.setStatus(Penalty.PenaltyStatus.APPROVED);
        penalty.setApprovedBy(currentUserId);
        penalty.setApprovedAt(LocalDateTime.now());
        penalty.setUpdateAt(LocalDateTime.now());
        
        Penalty updated = penaltyRepository.save(penalty);
        log.info("Approved penalty: penaltyId={}", penaltyId);
        
        return penaltyMapper.toPenaltyResponse(updated);
    }

    /**
     * Từ chối penalty
     */
    @Transactional
    public PenaltyResponse rejectPenalty(Integer penaltyId, String rejectionReason, Integer currentUserId, String currentUserRole) {
        Penalty penalty = penaltyRepository.findById(penaltyId)
            .orElseThrow(() -> new AppException(ErrorCode.PENALTY_NOT_FOUND));
        
        if (penalty.getStatus() != Penalty.PenaltyStatus.PENDING) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, "Penalty is not in PENDING status");
        }
        
        validateAuthorization(currentUserId, currentUserRole, penalty.getUserId(), penalty.getUserRole(), penalty.getBranchId());
        
        penalty.setStatus(Penalty.PenaltyStatus.REJECTED);
        penalty.setApprovedBy(currentUserId);
        penalty.setApprovedAt(LocalDateTime.now());
        penalty.setRejectionReason(rejectionReason);
        penalty.setUpdateAt(LocalDateTime.now());
        
        Penalty updated = penaltyRepository.save(penalty);
        log.info("Rejected penalty: penaltyId={}, reason={}", penaltyId, rejectionReason);
        
        return penaltyMapper.toPenaltyResponse(updated);
    }

    /**
     * Cập nhật penalty (cho phép mọi status)
     */
    @Transactional
    public PenaltyResponse updatePenalty(Integer penaltyId, PenaltyCreationRequest request, Integer currentUserId, String currentUserRole) {
        Penalty penalty = penaltyRepository.findById(penaltyId)
            .orElseThrow(() -> new AppException(ErrorCode.PENALTY_NOT_FOUND));

        // Không cho đổi user/branch/period
        validateAuthorization(currentUserId, currentUserRole, penalty.getUserId(), penalty.getUserRole(), penalty.getBranchId());

        // Nếu penalty đã APPROVED, cần check payroll
        if (penalty.getStatus() == Penalty.PenaltyStatus.APPROVED) {
            checkPayrollAndRecalculate(penalty.getUserId(), penalty.getPeriod(), currentUserId, currentUserRole);
        }

        if (request.getPenaltyType() != null) {
            penalty.setPenaltyType(Penalty.PenaltyType.valueOf(request.getPenaltyType()));
        }
        if (request.getAmount() != null) {
            penalty.setAmount(request.getAmount());
        }
        if (request.getDescription() != null) {
            penalty.setDescription(request.getDescription());
        }
        if (request.getIncidentDate() != null) {
            penalty.setIncidentDate(request.getIncidentDate());
        }
        if (request.getShiftId() != null) {
            penalty.setShiftId(request.getShiftId());
        }
        if (request.getReasonCode() != null) {
            penalty.setReasonCode(request.getReasonCode());
        }
        penalty.setUpdateAt(LocalDateTime.now());

        Penalty updated = penaltyRepository.save(penalty);
        log.info("Updated penalty: penaltyId={}, userId={}, period={}", updated.getPenaltyId(), updated.getUserId(), updated.getPeriod());

        return penaltyMapper.toPenaltyResponse(updated);
    }

    /**
     * Lấy danh sách penalty
     */
    public List<PenaltyResponse> getPenalties(Integer userId, Integer branchId, String period, String status) {
        List<Penalty> penalties;
        
        if (userId != null && period != null && status != null) {
            penalties = penaltyRepository.findByUserIdAndPeriodAndStatus(
                userId, period, Penalty.PenaltyStatus.valueOf(status));
        } else if (userId != null && period != null) {
            penalties = penaltyRepository.findByUserIdAndPeriod(userId, period);
        } else if (branchId != null && period != null) {
            penalties = penaltyRepository.findByBranchIdAndPeriod(branchId, period);
        } else if (branchId != null && status != null) {
            penalties = penaltyRepository.findByBranchIdAndStatus(branchId, Penalty.PenaltyStatus.valueOf(status));
        } else if (status != null) {
            penalties = penaltyRepository.findByStatus(Penalty.PenaltyStatus.valueOf(status));
        } else {
            penalties = penaltyRepository.findAll();
        }
        
        return penalties.stream()
            .map(penaltyMapper::toPenaltyResponse)
            .collect(Collectors.toList());
    }

    public List<PenaltyResponse> getPenaltiesByShift(Integer shiftId, Integer userId) {
        if (shiftId == null && userId == null) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, "shiftId or userId is required");
        }
        List<Penalty> penalties;
        if (shiftId != null && userId != null) {
            penalties = penaltyRepository.findByShiftIdAndUserId(shiftId, userId);
        } else if (shiftId != null) {
            penalties = penaltyRepository.findByShiftId(shiftId);
        } else {
            penalties = penaltyRepository.findByUserId(userId);
        }
        return penalties.stream().map(penaltyMapper::toPenaltyResponse).collect(Collectors.toList());
    }

    /**
     * Lấy chi tiết penalty
     */
    public PenaltyResponse getPenaltyById(Integer penaltyId) {
        Penalty penalty = penaltyRepository.findById(penaltyId)
            .orElseThrow(() -> new AppException(ErrorCode.PENALTY_NOT_FOUND));
        
        return penaltyMapper.toPenaltyResponse(penalty);
    }

    /**
     * Xóa penalty (cho phép mọi status)
     */
    @Transactional
    public void deletePenalty(Integer penaltyId, Integer currentUserId, String currentUserRole) {
        Penalty penalty = penaltyRepository.findById(penaltyId)
            .orElseThrow(() -> new AppException(ErrorCode.PENALTY_NOT_FOUND));
        
        validateAuthorization(currentUserId, currentUserRole, penalty.getUserId(), penalty.getUserRole(), penalty.getBranchId());
        
        penaltyRepository.delete(penalty);
        log.info("Deleted penalty: penaltyId={}", penaltyId);
    }

    private void validateAuthorization(Integer currentUserId, String currentUserRole, 
                                      Integer targetUserId, Penalty.UserRole targetUserRole, 
                                      Integer targetBranchId) {
        if ("ADMIN".equals(currentUserRole)) {
            return;
        }
        
        if ("MANAGER".equals(currentUserRole)) {
            if (targetUserRole != Penalty.UserRole.STAFF) {
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

    private Penalty.UserRole determineUserRole(Integer userId) {
        if (staffProfileRepository.findById(userId).isPresent()) {
            return Penalty.UserRole.STAFF;
        } else if (managerProfileRepository.findById(userId).isPresent()) {
            return Penalty.UserRole.MANAGER;
        }
        throw new AppException(ErrorCode.USER_ID_NOT_FOUND);
    }

    private Integer getManagerBranchId(Integer managerUserId) {
        ManagerProfile managerProfile = managerProfileRepository.findById(managerUserId)
            .orElseThrow(() -> new AppException(ErrorCode.USER_ID_NOT_FOUND));
        return managerProfile.getBranchId();
    }

    /**
     * Kiểm tra payroll và tự động recalculate nếu cần
     * Logic:
     * 1. Nếu payroll chưa tồn tại → OK (không làm gì)
     * 2. Nếu payroll DRAFT/REVIEW → Tự động recalculate
     * 3. Nếu payroll APPROVED/PAID → CHẶN (throw exception)
     */
    private void checkPayrollAndRecalculate(Integer userId, String period, Integer currentUserId, String currentUserRole) {
        Optional<Payroll> payrollOpt = payrollRepository.findByUserIdAndPeriod(userId, period);
        
        if (payrollOpt.isEmpty()) {
            // Chưa có payroll → OK, không làm gì
            log.debug("No payroll found for userId={}, period={}. Proceeding with bonus/penalty operation.", userId, period);
            return;
        }
        
        Payroll payroll = payrollOpt.get();
        
        if (payroll.getStatus() == Payroll.PayrollStatus.DRAFT || 
            payroll.getStatus() == Payroll.PayrollStatus.REVIEW) {
            // Tự động recalculate
            log.info("Auto-recalculating payroll: payrollId={}, userId={}, period={}", 
                payroll.getPayrollId(), userId, period);
            try {
                payrollService.recalculatePayroll(payroll.getPayrollId(), currentUserId, currentUserRole);
                log.info("Successfully auto-recalculated payroll: payrollId={}", payroll.getPayrollId());
            } catch (Exception e) {
                log.error("Failed to auto-recalculate payroll: payrollId={}", payroll.getPayrollId(), e);
                throw new AppException(ErrorCode.VALIDATION_FAILED, 
                    "Failed to auto-recalculate payroll: " + e.getMessage());
            }
        } else {
            // APPROVED/PAID → CHẶN
            String statusStr = payroll.getStatus().name();
            log.warn("Cannot modify bonus/penalty. Payroll is already {}: payrollId={}, userId={}, period={}", 
                statusStr, payroll.getPayrollId(), userId, period);
            throw new AppException(ErrorCode.PAYROLL_ALREADY_APPROVED_OR_PAID, 
                "Cannot modify bonus/penalty. Payroll for period " + period + 
                " is already " + statusStr + ". Please reject payroll first.");
        }
    }
}

