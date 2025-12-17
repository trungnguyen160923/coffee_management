package com.service.profile.service;

import com.service.profile.dto.request.ShiftTemplateCreationRequest;
import com.service.profile.dto.request.ShiftTemplateUpdateRequest;
import com.service.profile.dto.request.TemplateRoleRequirementRequest;
import com.service.profile.dto.response.ShiftTemplateResponse;
import com.service.profile.dto.response.TemplateRoleRequirementResponse;
import com.service.profile.entity.ShiftTemplate;
import com.service.profile.entity.ShiftTemplateRoleRequirement;
import com.service.profile.exception.AppException;
import com.service.profile.exception.ErrorCode;
import com.service.profile.repository.ShiftTemplateRepository;
import com.service.profile.repository.ShiftTemplateRoleRequirementRepository;
import com.service.profile.service.ShiftValidationService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityManager;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ShiftTemplateService {

    ShiftTemplateRepository shiftTemplateRepository;
    ShiftTemplateRoleRequirementRepository templateRoleRequirementRepository;
    ShiftValidationService shiftValidationService;
    EntityManager entityManager;

    public List<ShiftTemplateResponse> getActiveTemplatesByBranch(Integer branchId) {
        List<ShiftTemplate> templates = shiftTemplateRepository.findByBranchIdAndIsActiveTrue(branchId);
        return templates.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<ShiftTemplateResponse> getInactiveTemplatesByBranch(Integer branchId) {
        List<ShiftTemplate> templates = shiftTemplateRepository.findByBranchId(branchId)
                .stream()
                .filter(t -> Boolean.FALSE.equals(t.getIsActive()))
                .collect(Collectors.toList());
        return templates.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ShiftTemplateResponse createTemplate(ShiftTemplateCreationRequest request) {
        // Basic time validation
        validateTimeRange(request.getStartTime(), request.getEndTime());

        // Calculate and validate duration using centralized rules
        BigDecimal duration = calculateDurationHours(request.getStartTime(), request.getEndTime());
        shiftValidationService.validateShiftDuration(duration);

        // Validate branch existence (soft-fail if branch-service unavailable)
        shiftValidationService.validateBranchExists(request.getBranchId());

        // Normalize and validate employment type (server-side guard even if Bean Validation already runs)
        String employmentType = request.getEmploymentType();
        if (employmentType != null) {
            employmentType = employmentType.trim().toUpperCase();
            if (!java.util.List.of("FULL_TIME", "PART_TIME", "CASUAL", "ANY").contains(employmentType)) {
                throw new AppException(ErrorCode.VALIDATION_FAILED,
                        "Invalid employmentType. Must be one of FULL_TIME, PART_TIME, CASUAL, ANY");
            }
        } else {
            employmentType = "ANY";
        }

        // Validate role requirements against maxStaffAllowed (if provided)
        // Because one staff can have multiple roles, the strict lower bound
        // on number of staff needed is the maximum quantity required for any single role.
        if (request.getRoleRequirements() != null && !request.getRoleRequirements().isEmpty()
                && request.getMaxStaffAllowed() != null) {
            int maxRoleQuantity = request.getRoleRequirements().stream()
                    .filter(req -> req.getQuantity() != null)
                    .mapToInt(TemplateRoleRequirementRequest::getQuantity)
                    .max()
                    .orElse(0);

            if (maxRoleQuantity > request.getMaxStaffAllowed()) {
                throw new AppException(ErrorCode.VALIDATION_FAILED,
                        "Max staff must be at least the maximum required quantity for a single role. "
                                + "Current maxStaffAllowed = " + request.getMaxStaffAllowed()
                                + ", but at least one role requires " + maxRoleQuantity + " staff.");
            }
        }

        // Validate duplicate template name within branch (case-insensitive)
        shiftTemplateRepository.findByBranchIdAndNameIgnoreCase(request.getBranchId(), request.getName())
                .ifPresent(existing -> {
                    throw new AppException(ErrorCode.DUPLICATE_ENTITY,
                            "Shift template name already exists in this branch");
                });

        ShiftTemplate template = ShiftTemplate.builder()
                .branchId(request.getBranchId())
                .name(request.getName())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .durationHours(duration)
                .maxStaffAllowed(request.getMaxStaffAllowed())
                .employmentType(employmentType)
                .isActive(Boolean.TRUE)
                .description(request.getDescription())
                .build();

        template = shiftTemplateRepository.save(template);

        // Save role requirements if provided
        if (request.getRoleRequirements() != null && !request.getRoleRequirements().isEmpty()) {
            saveRoleRequirements(template, request.getRoleRequirements());
        }

        return toResponse(template);
    }

    @Transactional
    public ShiftTemplateResponse updateTemplate(Integer templateId, ShiftTemplateUpdateRequest request) {
        ShiftTemplate template = shiftTemplateRepository.findById(templateId)
                .orElseThrow(() -> new AppException(ErrorCode.SHIFT_TEMPLATE_NOT_FOUND));

        if (request.getName() != null) {
            template.setName(request.getName());
        }
        if (request.getStartTime() != null) {
            template.setStartTime(request.getStartTime());
        }
        if (request.getEndTime() != null) {
            template.setEndTime(request.getEndTime());
        }
        if (request.getMaxStaffAllowed() != null) {
            template.setMaxStaffAllowed(request.getMaxStaffAllowed());
        }
        if (request.getEmploymentType() != null) {
            template.setEmploymentType(request.getEmploymentType());
        }
        if (request.getDescription() != null) {
            template.setDescription(request.getDescription());
        }
        if (request.getIsActive() != null) {
            template.setIsActive(request.getIsActive());
        }

        // Validate time range and recalculate duration if times are present / changed
        if (template.getStartTime() != null && template.getEndTime() != null) {
            validateTimeRange(template.getStartTime(), template.getEndTime());
            template.setDurationHours(calculateDurationHours(template.getStartTime(), template.getEndTime()));
        }

        template = shiftTemplateRepository.save(template);

        // Update role requirements if provided (replace all)
        if (request.getRoleRequirements() != null) {
            // Delete existing requirements
            templateRoleRequirementRepository.deleteByTemplate_TemplateId(templateId);
            // Flush to ensure delete is committed before insert (prevents unique constraint violation)
            entityManager.flush();
            // Save new requirements
            if (!request.getRoleRequirements().isEmpty()) {
                saveRoleRequirements(template, request.getRoleRequirements());
            }
        }

        return toResponse(template);
    }

    public void deleteTemplate(Integer templateId) {
        ShiftTemplate template = shiftTemplateRepository.findById(templateId)
                .orElseThrow(() -> new AppException(ErrorCode.SHIFT_TEMPLATE_NOT_FOUND));

        // Soft delete: deactivate template
        template.setIsActive(Boolean.FALSE);
        shiftTemplateRepository.save(template);
    }

    private void validateTimeRange(LocalTime start, LocalTime end) {
        if (start == null || end == null || !start.isBefore(end)) {
            throw new AppException(ErrorCode.INVALID_TIME_RANGE);
        }
    }

    private BigDecimal calculateDurationHours(LocalTime start, LocalTime end) {
        long minutes = Duration.between(start, end).toMinutes();
        BigDecimal hours = BigDecimal.valueOf(minutes)
                .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
        return hours;
    }

    private void saveRoleRequirements(ShiftTemplate template, List<TemplateRoleRequirementRequest> requirements) {
        List<ShiftTemplateRoleRequirement> roleRequirements = new ArrayList<>();
        java.util.Set<Integer> seenRoleIds = new java.util.HashSet<>();
        for (TemplateRoleRequirementRequest req : requirements) {
            if (req.getRoleId() == null || req.getQuantity() == null || req.getQuantity() < 1) {
                throw new AppException(ErrorCode.VALIDATION_FAILED);
            }
            // Prevent duplicate role per template to avoid DB unique constraint violation
            if (!seenRoleIds.add(req.getRoleId())) {
                throw new AppException(
                        ErrorCode.VALIDATION_FAILED,
                        "Duplicate role in role requirements. Each role can only appear once per template."
                );
            }
            ShiftTemplateRoleRequirement roleReq = ShiftTemplateRoleRequirement.builder()
                    .template(template)
                    .roleId(req.getRoleId())
                    .quantity(req.getQuantity())
                    .required(req.getRequired() != null ? req.getRequired() : Boolean.TRUE)
                    .notes(req.getNotes())
                    .build();
            roleRequirements.add(roleReq);
        }
        templateRoleRequirementRepository.saveAll(roleRequirements);
    }

    private ShiftTemplateResponse toResponse(ShiftTemplate template) {
        ShiftTemplateResponse resp = new ShiftTemplateResponse();
        resp.setTemplateId(template.getTemplateId());
        resp.setBranchId(template.getBranchId());
        resp.setName(template.getName());
        resp.setStartTime(template.getStartTime());
        resp.setEndTime(template.getEndTime());
        resp.setDurationHours(template.getDurationHours());
        resp.setMaxStaffAllowed(template.getMaxStaffAllowed());
        resp.setEmploymentType(template.getEmploymentType());
        resp.setIsActive(template.getIsActive());
        resp.setDescription(template.getDescription());

        // Load role requirements
        List<ShiftTemplateRoleRequirement> roleRequirements = 
                templateRoleRequirementRepository.findByTemplate(template);
        List<TemplateRoleRequirementResponse> roleReqResponses = roleRequirements.stream()
                .map(this::toRoleRequirementResponse)
                .collect(Collectors.toList());
        resp.setRoleRequirements(roleReqResponses);

        return resp;
    }

    private TemplateRoleRequirementResponse toRoleRequirementResponse(ShiftTemplateRoleRequirement req) {
        TemplateRoleRequirementResponse resp = new TemplateRoleRequirementResponse();
        resp.setId(req.getId());
        resp.setRoleId(req.getRoleId());
        resp.setQuantity(req.getQuantity());
        resp.setRequired(req.getRequired());
        resp.setNotes(req.getNotes());
        return resp;
    }
}



