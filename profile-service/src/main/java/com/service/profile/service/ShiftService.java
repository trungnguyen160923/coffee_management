package com.service.profile.service;

import com.service.profile.dto.request.ShiftBatchCreateRequest;
import com.service.profile.dto.request.ShiftCreationRequest;
import com.service.profile.dto.request.ShiftRoleRequirementRequest;
import com.service.profile.dto.request.ShiftUpdateRequest;
import com.service.profile.dto.response.ShiftResponse;
import com.service.profile.dto.response.ShiftRoleRequirementResponse;
import com.service.profile.entity.Shift;
import com.service.profile.entity.ShiftAssignment;
import com.service.profile.entity.ShiftRoleRequirement;
import com.service.profile.entity.ShiftTemplate;
import com.service.profile.entity.ShiftTemplateRoleRequirement;
import com.service.profile.exception.AppException;
import com.service.profile.exception.ErrorCode;
import com.service.profile.repository.ShiftAssignmentRepository;
import com.service.profile.repository.ShiftRepository;
import com.service.profile.repository.ShiftRoleRequirementRepository;
import com.service.profile.repository.ShiftTemplateRepository;
import com.service.profile.repository.ShiftTemplateRoleRequirementRepository;
import com.service.profile.repository.http_client.BranchClosureClient;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ShiftService {

    ShiftRepository shiftRepository;
    ShiftTemplateRepository shiftTemplateRepository;
    ShiftAssignmentRepository shiftAssignmentRepository;
    ShiftTemplateRoleRequirementRepository templateRoleRequirementRepository;
    ShiftRoleRequirementRepository shiftRoleRequirementRepository;
    BranchClosureClient branchClosureClient;
    ShiftValidationService shiftValidationService;
    StaffProfileService staffProfileService; // For getting staff list to notify
    ShiftNotificationService shiftNotificationService; // For sending notifications

    public List<ShiftResponse> getShiftsByBranchAndDateRange(Integer branchId, LocalDate start, LocalDate end, String status) {
        List<Shift> shifts = shiftRepository.findByBranchIdAndShiftDateBetween(branchId, start, end);
        if (status != null && !status.isBlank()) {
            String normalized = status.toUpperCase();
            shifts = shifts.stream()
                    .filter(s -> normalized.equalsIgnoreCase(s.getStatus()))
                    .collect(Collectors.toList());
        }
        return shifts.stream().map(this::toShiftResponse).collect(Collectors.toList());
    }

    @Transactional
    public ShiftResponse createShift(ShiftCreationRequest request, Integer managerUserId) {
        // Validate shift date (cho phép hôm nay vì manager tạo ca)
        if (request.getShiftDate() != null) {
            shiftValidationService.validateShiftDate(request.getShiftDate(), true);
        }
        
        // Validate branch availability (working days and closures)
        if (request.getBranchId() != null && request.getShiftDate() != null) {
            shiftValidationService.validateBranchAvailability(request.getBranchId(), request.getShiftDate());
        }
        
        // Validate time range
        if (request.getStartTime() != null && request.getEndTime() != null) {
            validateTimeRange(request.getStartTime(), request.getEndTime());
            // Validate duration
            BigDecimal duration = calculateDurationHours(request.getStartTime(), request.getEndTime());
            shiftValidationService.validateShiftDuration(duration);
        }
        
        // Check for time overlap with existing shifts
        if (request.getBranchId() != null && request.getShiftDate() != null 
                && request.getStartTime() != null && request.getEndTime() != null) {
            validateShiftTimeOverlap(request.getBranchId(), request.getShiftDate(), 
                    request.getStartTime(), request.getEndTime(), null);
        }
        
        Shift shift = buildShiftFromRequest(null, request, managerUserId);
        shift = shiftRepository.save(shift);
        
        // Handle role requirements:
        // 1. If roleRequirements provided in request, use them (override template)
        // 2. Else if template is used, copy from template
        if (request.getRoleRequirements() != null && !request.getRoleRequirements().isEmpty()) {
            saveRoleRequirementsFromRequest(shift, request.getRoleRequirements());
        } else if (shift.getTemplate() != null) {
            copyRoleRequirementsFromTemplate(shift);
        }
        
        // No notification when creating draft - only notify when published
        return toShiftResponse(shift);
    }

    public ShiftResponse getShift(Integer shiftId) {
        Shift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new AppException(ErrorCode.SHIFT_NOT_FOUND));
        return toShiftResponse(shift);
    }

    @Transactional
    public ShiftResponse updateShift(Integer shiftId, ShiftUpdateRequest request, Integer managerUserId) {
        Shift existing = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new AppException(ErrorCode.SHIFT_NOT_FOUND));

        // Only update provided fields
        if (request.getBranchId() != null) {
            existing.setBranchId(request.getBranchId());
        }

        if (request.getTemplateId() != null) {
            ShiftTemplate template = shiftTemplateRepository.findById(request.getTemplateId())
                    .orElseThrow(() -> new AppException(ErrorCode.SHIFT_TEMPLATE_NOT_FOUND));
            existing.setTemplate(template);
        }

        if (request.getShiftDate() != null) {
            // Validate shift date (cho phép hôm nay vì manager update ca)
            shiftValidationService.validateShiftDate(request.getShiftDate(), true);
            
            // Validate branch availability (working days and closures) for new date
            Integer branchIdToCheck = request.getBranchId() != null ? request.getBranchId() : existing.getBranchId();
            if (branchIdToCheck != null && request.getShiftDate() != null) {
                shiftValidationService.validateBranchAvailability(branchIdToCheck, request.getShiftDate());
            }
            
            existing.setShiftDate(request.getShiftDate());
        }
        if (request.getStartTime() != null) {
            existing.setStartTime(request.getStartTime());
        }
        if (request.getEndTime() != null) {
            existing.setEndTime(request.getEndTime());
        }

        if (existing.getStartTime() != null && existing.getEndTime() != null) {
            validateTimeRange(existing.getStartTime(), existing.getEndTime());
            BigDecimal duration = calculateDurationHours(existing.getStartTime(), existing.getEndTime());
            shiftValidationService.validateShiftDuration(duration);
            existing.setDurationHours(duration);
        }
        
        // Check for time overlap with existing shifts (excluding current shift)
        if (existing.getBranchId() != null && existing.getShiftDate() != null 
                && existing.getStartTime() != null && existing.getEndTime() != null) {
            validateShiftTimeOverlap(existing.getBranchId(), existing.getShiftDate(), 
                    existing.getStartTime(), existing.getEndTime(), shiftId);
        }

        if (request.getMaxStaffAllowed() != null) {
            existing.setMaxStaffAllowed(request.getMaxStaffAllowed());
        }
        if (request.getEmploymentType() != null) {
            existing.setEmploymentType(request.getEmploymentType());
        }
        if (request.getStatus() != null) {
            existing.setStatus(request.getStatus());
        }
        if (request.getNotes() != null) {
            existing.setNotes(request.getNotes());
        }

        existing = shiftRepository.save(existing);
        
        // Update role requirements if provided (replace all)
        if (request.getRoleRequirements() != null) {
            // Delete existing requirements
            List<ShiftRoleRequirement> existingRequirements = 
                shiftRoleRequirementRepository.findByShift(existing);
            if (!existingRequirements.isEmpty()) {
                shiftRoleRequirementRepository.deleteAll(existingRequirements);
            }
            // Save new requirements
            if (!request.getRoleRequirements().isEmpty()) {
                saveRoleRequirementsFromRequest(existing, request.getRoleRequirements());
            }
        }
        
        existing = shiftRepository.save(existing);
        
        // Notify about draft update (simplified approach)
        if ("DRAFT".equals(existing.getStatus()) && existing.getBranchId() != null) {
            try {
                shiftNotificationService.notifyDraftShiftUpdated(existing, existing.getBranchId());
            } catch (Exception e) {
                log.error("Failed to send draft shift updated notification", e);
            }
        }
        
        return toShiftResponse(existing);
    }

    @Transactional
    public void deleteShift(Integer shiftId) {
        Shift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new AppException(ErrorCode.SHIFT_NOT_FOUND));
        
        Integer branchId = shift.getBranchId();
        boolean isDraft = "DRAFT".equalsIgnoreCase(shift.getStatus());
        
        if (isDraft || "CANCELLED".equalsIgnoreCase(shift.getStatus())) {
            // Hard delete allowed for draft and cancelled shifts
            // First, delete all related role requirements to avoid foreign key constraint violation
            shiftRoleRequirementRepository.deleteByShift_ShiftId(shiftId);
            shiftRepository.delete(shift);
            
            // Notify about draft deletion (simplified approach)
            if (isDraft && branchId != null) {
                try {
                    shiftNotificationService.notifyDraftShiftDeleted(shift, branchId);
                } catch (Exception e) {
                    log.error("Failed to send draft shift deleted notification", e);
                }
            }
        } else {
            // For published or other status shifts, mark as CANCELLED (soft delete)
            shift.setStatus("CANCELLED");
            shiftRepository.save(shift);
        }
    }

    public ShiftResponse publishShift(Integer shiftId) {
        Shift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new AppException(ErrorCode.SHIFT_NOT_FOUND));
        shift.setStatus("PUBLISHED");
        shift = shiftRepository.save(shift);
        
        // Notify staff with matching role and employment_type
        if (shift.getBranchId() != null) {
            try {
                List<com.service.profile.dto.response.StaffWithUserResponse> staffList = 
                        staffProfileService.getStaffsWithUserInfoByBranch(shift.getBranchId());
                
                // Filter by role requirements if any
                List<com.service.profile.dto.response.StaffWithUserResponse> eligibleStaff = new ArrayList<>(staffList);
                List<ShiftRoleRequirement> roleRequirements = shiftRoleRequirementRepository.findByShift(shift);
                if (!roleRequirements.isEmpty()) {
                    List<Integer> requiredRoleIds = roleRequirements.stream()
                            .map(ShiftRoleRequirement::getRoleId)
                            .collect(Collectors.toList());
                    eligibleStaff = staffList.stream()
                            .filter(staff -> {
                                List<Integer> staffRoleIds = staff.getStaffBusinessRoleIds();
                                if (staffRoleIds == null || staffRoleIds.isEmpty()) {
                                    return false;
                                }
                                return staffRoleIds.stream().anyMatch(requiredRoleIds::contains);
                            })
                            .collect(Collectors.toList());
                }
                
                // Filter by employment_type
                String shiftEmploymentType = shift.getEmploymentType();
                if (shiftEmploymentType == null && shift.getTemplate() != null) {
                    shiftEmploymentType = shift.getTemplate().getEmploymentType();
                }
                if (shiftEmploymentType == null) {
                    shiftEmploymentType = "ANY";
                }
                
                final String finalEmploymentType = shiftEmploymentType;
                List<Integer> eligibleStaffIds = eligibleStaff.stream()
                        .filter(staff -> {
                            // If shift employment_type is ANY, include all staff
                            if ("ANY".equals(finalEmploymentType)) {
                                return true;
                            }
                            // Otherwise, only include staff with matching employment_type
                            return finalEmploymentType.equals(staff.getEmploymentType());
                        })
                        .map(com.service.profile.dto.response.StaffWithUserResponse::getUserId)
                        .collect(Collectors.toList());
                
                shiftNotificationService.notifyShiftPublished(shift, shift.getBranchId(), eligibleStaffIds);
            } catch (Exception e) {
                log.error("Failed to send shift published notification for shift {}", shiftId, e);
            }
        }
        
        return toShiftResponse(shift);
    }

    public ShiftResponse revertToDraft(Integer shiftId) {
        Shift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new AppException(ErrorCode.SHIFT_NOT_FOUND));
        if (!"PUBLISHED".equalsIgnoreCase(shift.getStatus())) {
            throw new AppException(ErrorCode.SHIFT_NOT_PUBLISHED);
        }
        
        // Check if shift has any staff assignments
        List<ShiftAssignment> assignments = shiftAssignmentRepository.findByShift(shift);
        if (!assignments.isEmpty()) {
            throw new AppException(ErrorCode.SHIFT_HAS_ASSIGNMENTS, 
                    "Cannot revert shift to draft because it has staff assignments. Please remove all assignments first.");
        }
        
        shift.setStatus("DRAFT");
        shift = shiftRepository.save(shift);
        return toShiftResponse(shift);
    }

    public com.service.profile.dto.response.BatchOperationResponse batchPublishShifts(
            Integer branchId, LocalDate startDate, LocalDate endDate) {
        List<Shift> shifts = shiftRepository.findByBranchIdAndShiftDateBetween(branchId, startDate, endDate);
        
        List<Shift> updated = new ArrayList<>();
        int skippedCount = 0;
        
        for (Shift shift : shifts) {
            // Only publish DRAFT shifts
            if ("DRAFT".equalsIgnoreCase(shift.getStatus())) {
                shift.setStatus("PUBLISHED");
                updated.add(shift);
            } else {
                skippedCount++;
            }
        }
        
        if (updated.isEmpty()) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 
                    "No DRAFT shifts found in the specified date range");
        }
        
        updated = shiftRepository.saveAll(updated);
        
        // Notify staff for each published shift
        for (Shift shift : updated) {
            try {
                if (shift.getBranchId() != null) {
                    List<com.service.profile.dto.response.StaffWithUserResponse> staffList = 
                            staffProfileService.getStaffsWithUserInfoByBranch(shift.getBranchId());
                    
                    // Filter by role requirements if any
                    List<com.service.profile.dto.response.StaffWithUserResponse> eligibleStaff = new ArrayList<>(staffList);
                    List<ShiftRoleRequirement> roleRequirements = shiftRoleRequirementRepository.findByShift(shift);
                    if (!roleRequirements.isEmpty()) {
                        List<Integer> requiredRoleIds = roleRequirements.stream()
                                .map(ShiftRoleRequirement::getRoleId)
                                .collect(Collectors.toList());
                        eligibleStaff = staffList.stream()
                                .filter(staff -> {
                                    List<Integer> staffRoleIds = staff.getStaffBusinessRoleIds();
                                    if (staffRoleIds == null || staffRoleIds.isEmpty()) {
                                        return false;
                                    }
                                    return staffRoleIds.stream().anyMatch(requiredRoleIds::contains);
                                })
                                .collect(Collectors.toList());
                    }
                    
                    // Filter by employment_type
                    String shiftEmploymentType = shift.getEmploymentType();
                    if (shiftEmploymentType == null && shift.getTemplate() != null) {
                        shiftEmploymentType = shift.getTemplate().getEmploymentType();
                    }
                    if (shiftEmploymentType == null) {
                        shiftEmploymentType = "ANY";
                    }
                    
                    final String finalEmploymentType = shiftEmploymentType;
                    List<Integer> eligibleStaffIds = eligibleStaff.stream()
                            .filter(staff -> {
                                // If shift employment_type is ANY, include all staff
                                if ("ANY".equals(finalEmploymentType)) {
                                    return true;
                                }
                                // Otherwise, only include staff with matching employment_type
                                return finalEmploymentType.equals(staff.getEmploymentType());
                            })
                            .map(com.service.profile.dto.response.StaffWithUserResponse::getUserId)
                            .collect(Collectors.toList());
                    
                    shiftNotificationService.notifyShiftPublished(shift, shift.getBranchId(), eligibleStaffIds);
                }
            } catch (Exception e) {
                log.error("Failed to send shift published notification for shift {}", shift.getShiftId(), e);
            }
        }
        
        return com.service.profile.dto.response.BatchOperationResponse.builder()
                .successCount(updated.size())
                .skippedCount(skippedCount)
                .updatedShifts(updated.stream().map(this::toShiftResponse).collect(Collectors.toList()))
                .build();
    }

    public com.service.profile.dto.response.BatchOperationResponse batchCancelShifts(
            Integer branchId, LocalDate startDate, LocalDate endDate) {
        List<Shift> shifts = shiftRepository.findByBranchIdAndShiftDateBetween(branchId, startDate, endDate);
        
        List<Shift> updated = new ArrayList<>();
        int skippedCount = 0;
        LocalDate today = LocalDate.now();
        
        for (Shift shift : shifts) {
            // Only cancel future shifts (not past or today)
            if (shift.getShiftDate().isAfter(today)) {
                // Skip if already cancelled
                if (!"CANCELLED".equalsIgnoreCase(shift.getStatus())) {
                    shift.setStatus("CANCELLED");
                    updated.add(shift);
                } else {
                    skippedCount++;
                }
            } else {
                skippedCount++;
            }
        }
        
        if (updated.isEmpty()) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 
                    "No future shifts found to cancel in the specified date range");
        }
        
        updated = shiftRepository.saveAll(updated);
        return com.service.profile.dto.response.BatchOperationResponse.builder()
                .successCount(updated.size())
                .skippedCount(skippedCount)
                .updatedShifts(updated.stream().map(this::toShiftResponse).collect(Collectors.toList()))
                .build();
    }

    public List<ShiftResponse> batchCreateShifts(ShiftBatchCreateRequest request, Integer managerUserId) {
        if (request.getStartDate() == null || request.getEndDate() == null ||
                request.getStartDate().isAfter(request.getEndDate())) {
            throw new AppException(ErrorCode.VALIDATION_FAILED);
        }
        if (request.getStartDate().isBefore(LocalDate.now()) || request.getEndDate().isBefore(LocalDate.now())) {
            throw new AppException(ErrorCode.VALIDATION_FAILED);
        }

        // Fetch branch closures for the date range
        List<BranchClosureClient.BranchClosureResponse> closuresList = new ArrayList<>();
        try {
            var closureResponse = branchClosureClient.listClosures(
                    request.getBranchId(),
                    request.getStartDate(),
                    request.getEndDate()
            );
            if (closureResponse != null && closureResponse.getResult() != null) {
                closuresList = closureResponse.getResult();
            }
        } catch (Exception e) {
            log.error("Failed to fetch branch closures from order-service: {}", e.getMessage(), e);
            String errorMessage = "Failed to fetch branch closures from order-service: " + 
                    (e.getMessage() != null ? e.getMessage() : "Unknown error");
            throw new AppException(ErrorCode.EXTERNAL_SERVICE_ERROR, errorMessage);
        }
        final List<BranchClosureClient.BranchClosureResponse> closures = closuresList;

        // Helper methods using validation service
        final Integer branchIdForCheck = request.getBranchId();
        java.util.function.Predicate<LocalDate> isWorkingDay = (date) -> 
            shiftValidationService.isBranchWorkingDay(branchIdForCheck, date);
        java.util.function.Predicate<LocalDate> isDateClosed = (date) -> 
            shiftValidationService.isBranchClosed(branchIdForCheck, date, closures);

        List<Shift> created = new ArrayList<>();
        LocalDate date = request.getStartDate();
        int closureSkippedCount = 0;
        int overlapSkippedCount = 0;
        
        while (!date.isAfter(request.getEndDate())) {
            // Skip dates that are not working days
            if (!isWorkingDay.test(date)) {
                closureSkippedCount++;
                log.debug("Skipping shift creation for date {} due to branch not being open on this day", date);
            } else if (isDateClosed.test(date)) {
                // Skip dates that are closed (branch closure)
                closureSkippedCount++;
                log.debug("Skipping shift creation for date {} due to branch closure", date);
            } else {
                ShiftCreationRequest single = new ShiftCreationRequest();
                single.setBranchId(request.getBranchId());
                single.setTemplateId(request.getTemplateId());
                single.setShiftDate(date);
                // Times will be derived from template inside builder if template present
                // or need to be set explicitly by caller (out of scope for this simple batch)
                Shift shift = buildShiftFromTemplate(single, managerUserId, request.getMaxStaffAllowed(), request.getNotes());
                
                // Validate time overlap before adding to list
                if (shift.getBranchId() != null && shift.getShiftDate() != null 
                        && shift.getStartTime() != null && shift.getEndTime() != null) {
                    try {
                        // Check overlap with existing shifts in database
                        validateShiftTimeOverlap(shift.getBranchId(), shift.getShiftDate(), 
                                shift.getStartTime(), shift.getEndTime(), null);
                        
                        // Check overlap with shifts being created in this batch (same date)
                        boolean hasOverlapInBatch = false;
                        for (Shift existingInBatch : created) {
                            if (existingInBatch.getShiftDate().equals(shift.getShiftDate())) {
                                if (shift.getStartTime().isBefore(existingInBatch.getEndTime()) 
                                        && shift.getEndTime().isAfter(existingInBatch.getStartTime())) {
                                    hasOverlapInBatch = true;
                                    break;
                                }
                            }
                        }
                        
                        if (hasOverlapInBatch) {
                            overlapSkippedCount++;
                            log.debug("Skipping shift creation for date {} due to time overlap with shift in same batch", date);
                        } else {
                            created.add(shift);
                        }
                    } catch (AppException e) {
                        // Skip this shift if it overlaps with existing one in database
                        overlapSkippedCount++;
                        log.debug("Skipping shift creation for date {} due to time overlap with existing shift", date);
                    }
                } else {
                    created.add(shift);
                }
            }
            date = date.plusDays(1);
        }

        // Calculate total dates in range
        long totalDates = java.time.temporal.ChronoUnit.DAYS.between(request.getStartDate(), request.getEndDate()) + 1;
        
        if (closureSkippedCount > 0 || overlapSkippedCount > 0) {
            StringBuilder logMessage = new StringBuilder("Batch create shifts: ");
            List<String> skipReasons = new ArrayList<>();
            if (closureSkippedCount > 0) {
                skipReasons.add(closureSkippedCount + " date(s) skipped due to branch closures");
            }
            if (overlapSkippedCount > 0) {
                skipReasons.add(overlapSkippedCount + " shift(s) skipped due to time overlap");
            }
            logMessage.append(String.join(", ", skipReasons));
            logMessage.append(", ").append(created.size()).append(" shift(s) created");
            log.info(logMessage.toString());
        }

        // If no shifts were created, throw exception with detailed message
        if (created.isEmpty()) {
            StringBuilder errorMessage = new StringBuilder("No shifts were created. ");
            List<String> reasons = new ArrayList<>();
            if (closureSkippedCount == totalDates) {
                reasons.add("All dates are closed");
            } else if (overlapSkippedCount > 0 && closureSkippedCount == 0) {
                reasons.add("All shifts overlap with existing shifts");
            } else if (closureSkippedCount > 0 && overlapSkippedCount > 0) {
                reasons.add(closureSkippedCount + " date(s) are closed and " + overlapSkippedCount + " shift(s) overlap with existing shifts");
            } else {
                reasons.add("All dates are closed or shifts overlap with existing shifts");
            }
            errorMessage.append(String.join(", ", reasons));
            throw new AppException(ErrorCode.VALIDATION_FAILED, errorMessage.toString());
        }

        created = shiftRepository.saveAll(created);
        
        // Handle role requirements for all created shifts:
        // 1. If roleRequirements provided in request, use them (override template)
        // 2. Else if template is used, copy from template
        if (request.getRoleRequirements() != null && !request.getRoleRequirements().isEmpty()) {
            // Use role requirements from request for all shifts
            for (Shift shift : created) {
                saveRoleRequirementsFromRequest(shift, request.getRoleRequirements());
            }
        } else {
            // Copy role requirements from template for all created shifts
            for (Shift shift : created) {
                if (shift.getTemplate() != null) {
                    copyRoleRequirementsFromTemplate(shift);
                }
            }
        }
        
        return created.stream().map(this::toShiftResponse).collect(Collectors.toList());
    }

    private Shift buildShiftFromRequest(Shift existing, ShiftCreationRequest request, Integer managerUserId) {
        ShiftTemplate template = null;
        if (request.getTemplateId() != null) {
            template = shiftTemplateRepository.findById(request.getTemplateId())
                    .orElseThrow(() -> new AppException(ErrorCode.SHIFT_TEMPLATE_NOT_FOUND));
        }

        if (request.getStartTime() != null && request.getEndTime() != null) {
            validateTimeRange(request.getStartTime(), request.getEndTime());
        }

        BigDecimal duration = null;
        if (request.getStartTime() != null && request.getEndTime() != null) {
            duration = calculateDurationHours(request.getStartTime(), request.getEndTime());
        }

        Shift shift = new Shift();
        if (existing != null) {
            shift.setShiftId(existing.getShiftId());
            shift.setCreateAt(existing.getCreateAt());
            shift.setStatus(existing.getStatus());
            shift.setCreatedBy(existing.getCreatedBy());
        } else {
            shift.setStatus("DRAFT");
            shift.setCreatedBy(managerUserId);
        }

        shift.setBranchId(request.getBranchId());
        shift.setTemplate(template);
        shift.setShiftDate(request.getShiftDate());
        shift.setStartTime(request.getStartTime());
        shift.setEndTime(request.getEndTime());
        shift.setDurationHours(duration);
        shift.setMaxStaffAllowed(request.getMaxStaffAllowed());
        // employmentType: nếu request có thì dùng, nếu null thì sẽ kế thừa từ template trong @PrePersist
        shift.setEmploymentType(request.getEmploymentType());
        shift.setNotes(request.getNotes());

        return shift;
    }

    private Shift buildShiftFromTemplate(ShiftCreationRequest request, Integer managerUserId, Integer overrideMaxStaff, String notes) {
        ShiftTemplate template = null;
        if (request.getTemplateId() != null) {
            template = shiftTemplateRepository.findById(request.getTemplateId())
                    .orElseThrow(() -> new AppException(ErrorCode.SHIFT_TEMPLATE_NOT_FOUND));
        }

        if (template == null) {
            throw new AppException(ErrorCode.SHIFT_TEMPLATE_NOT_FOUND);
        }

        Shift shift = Shift.builder()
                .branchId(request.getBranchId())
                .template(template)
                .shiftDate(request.getShiftDate())
                .startTime(template.getStartTime())
                .endTime(template.getEndTime())
                .durationHours(template.getDurationHours())
                .maxStaffAllowed(overrideMaxStaff != null ? overrideMaxStaff : template.getMaxStaffAllowed())
                .employmentType(request.getEmploymentType()) // NULL = sẽ kế thừa từ template trong @PrePersist
                .createdBy(managerUserId)
                .notes(notes)
                .status("DRAFT")
                .build();

        return shift;
    }

    /**
     * Save role requirements from request to shift
     */
    private void saveRoleRequirementsFromRequest(Shift shift, List<ShiftRoleRequirementRequest> requirements) {
        List<ShiftRoleRequirement> shiftRequirements = new ArrayList<>();
        for (ShiftRoleRequirementRequest req : requirements) {
            if (req.getRoleId() == null || req.getQuantity() == null || req.getQuantity() < 1) {
                throw new AppException(ErrorCode.VALIDATION_FAILED, 
                    "Role requirement must have roleId and quantity (at least 1)");
            }
            ShiftRoleRequirement shiftReq = ShiftRoleRequirement.builder()
                    .shift(shift)
                    .roleId(req.getRoleId())
                    .quantity(req.getQuantity())
                    .required(req.getRequired() != null ? req.getRequired() : Boolean.TRUE)
                    .notes(req.getNotes())
                    .build();
            shiftRequirements.add(shiftReq);
        }
        shiftRoleRequirementRepository.saveAll(shiftRequirements);
        log.debug("Saved {} role requirements from request to shift {}", 
                shiftRequirements.size(), shift.getShiftId());
    }

    /**
     * Copy role requirements from template to shift
     */
    private void copyRoleRequirementsFromTemplate(Shift shift) {
        if (shift.getTemplate() == null) {
            return;
        }

        List<ShiftTemplateRoleRequirement> templateRequirements = 
                templateRoleRequirementRepository.findByTemplate(shift.getTemplate());

        if (templateRequirements.isEmpty()) {
            log.debug("No role requirements found for template {}", shift.getTemplate().getTemplateId());
            return;
        }

        List<ShiftRoleRequirement> shiftRequirements = new ArrayList<>();
        for (ShiftTemplateRoleRequirement templateReq : templateRequirements) {
            ShiftRoleRequirement shiftReq = ShiftRoleRequirement.builder()
                    .shift(shift)
                    .roleId(templateReq.getRoleId())
                    .quantity(templateReq.getQuantity())
                    .required(templateReq.getRequired())
                    .notes(templateReq.getNotes())
                    .build();
            shiftRequirements.add(shiftReq);
        }

        shiftRoleRequirementRepository.saveAll(shiftRequirements);
        log.debug("Copied {} role requirements from template {} to shift {}", 
                shiftRequirements.size(), shift.getTemplate().getTemplateId(), shift.getShiftId());
    }

    private void validateTimeRange(java.time.LocalTime start, java.time.LocalTime end) {
        if (start == null || end == null || !start.isBefore(end)) {
            throw new AppException(ErrorCode.INVALID_TIME_RANGE);
        }
    }
    
    private void validateShiftTimeOverlap(Integer branchId, LocalDate shiftDate, 
            java.time.LocalTime startTime, java.time.LocalTime endTime, Integer excludeShiftId) {
        // Find all active shifts (not CANCELLED) for the same branch and date
        List<Shift> existingShifts = shiftRepository.findByBranchIdAndShiftDateAndStatusNot(
                branchId, shiftDate, "CANCELLED");
        
        log.debug("Validating shift time: New shift [{} - {}] on {} for branch {}. Found {} existing shifts (excluding ID: {})", 
            startTime, endTime, shiftDate, branchId, existingShifts.size(), excludeShiftId);
        
        for (Shift existingShift : existingShifts) {
            // Skip the shift being updated
            if (excludeShiftId != null && existingShift.getShiftId().equals(excludeShiftId)) {
                log.debug("Skipping shift ID {} (being updated)", excludeShiftId);
                continue;
            }
            
            // Check if shift times are EXACTLY the same (not allowed)
            // Allow overlapping times, but not identical times
            boolean sameStartTime = startTime.equals(existingShift.getStartTime());
            boolean sameEndTime = endTime.equals(existingShift.getEndTime());
            
            log.debug("Comparing with existing shift ID {}: [{} - {}]. sameStartTime={}, sameEndTime={}", 
                existingShift.getShiftId(), existingShift.getStartTime(), existingShift.getEndTime(), 
                sameStartTime, sameEndTime);
            
            if (sameStartTime && sameEndTime) {
                log.warn("Duplicate shift time detected: New shift [{} - {}] is identical to existing shift [{} - {}] (ID: {}) on {}", 
                    startTime, endTime, existingShift.getStartTime(), existingShift.getEndTime(), 
                    existingShift.getShiftId(), shiftDate);
                throw new AppException(ErrorCode.SHIFT_TIME_OVERLAP, 
                    String.format("A shift with the same time [%s - %s] already exists on %s. Please choose a different time or edit the existing shift.", 
                        startTime, endTime, shiftDate));
            }
        }
        
        log.debug("No duplicate shift time detected for shift [{} - {}] on {}", startTime, endTime, shiftDate);
    }

    private BigDecimal calculateDurationHours(java.time.LocalTime start, java.time.LocalTime end) {
        long minutes = Duration.between(start, end).toMinutes();
        return BigDecimal.valueOf(minutes)
                .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
    }

    private ShiftResponse toShiftResponse(Shift shift) {
        ShiftResponse resp = new ShiftResponse();
        resp.setShiftId(shift.getShiftId());
        resp.setBranchId(shift.getBranchId());
        resp.setTemplateId(shift.getTemplate() != null ? shift.getTemplate().getTemplateId() : null);
        resp.setShiftDate(shift.getShiftDate());
        resp.setStartTime(shift.getStartTime());
        resp.setEndTime(shift.getEndTime());
        resp.setDurationHours(shift.getDurationHours());
        resp.setMaxStaffAllowed(shift.getMaxStaffAllowed());
        // employmentType: nếu null thì lấy từ template, nếu template cũng null thì null
        if (shift.getEmploymentType() != null) {
            resp.setEmploymentType(shift.getEmploymentType());
        } else if (shift.getTemplate() != null && shift.getTemplate().getEmploymentType() != null) {
            resp.setEmploymentType(shift.getTemplate().getEmploymentType());
        }
        resp.setStatus(shift.getStatus());
        resp.setNotes(shift.getNotes());
        
        // Load role requirements
        List<ShiftRoleRequirement> roleRequirements = 
                shiftRoleRequirementRepository.findByShift(shift);
        List<ShiftRoleRequirementResponse> roleReqResponses = roleRequirements.stream()
                .map(this::toRoleRequirementResponse)
                .collect(Collectors.toList());
        resp.setRoleRequirements(roleReqResponses);
        
        return resp;
    }
    
    private ShiftRoleRequirementResponse toRoleRequirementResponse(ShiftRoleRequirement req) {
        ShiftRoleRequirementResponse resp = new ShiftRoleRequirementResponse();
        resp.setId(req.getId());
        resp.setRoleId(req.getRoleId());
        resp.setQuantity(req.getQuantity());
        resp.setRequired(req.getRequired());
        resp.setNotes(req.getNotes());
        return resp;
    }
}


