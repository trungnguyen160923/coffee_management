package com.service.profile.listeners;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import feign.FeignException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.service.profile.dto.ApiResponse;
import com.service.profile.dto.request.ManagerProfileCreationRequest;
import com.service.profile.dto.request.StaffProfileCreationRequest;
import com.service.profile.dto.request.CustomerProfileCreationRequest;
import com.service.profile.entity.ProcessedEvent;
import com.service.profile.events.UserCreatedV2Event;
import com.service.profile.events.UserProfileFailedEvent;
import com.service.profile.events.UserProfileCompletedEvent;
import com.service.profile.repository.ProcessedEventRepository;
import com.service.profile.repository.http_client.BranchClient;
import com.service.profile.repository.ManagerProfileRepository;
import com.service.profile.repository.StaffProfileRepository;
import com.service.profile.repository.CustomerProfileRepository;
import com.service.profile.repository.StaffRoleAssignmentRepository;
import com.service.profile.service.ManagerProfileService;
import com.service.profile.service.StaffProfileService;
import com.service.profile.service.CustomerProfileService;

import java.time.Instant;
import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;

@Component
public class UserCreatedV2Listener {
    private final ObjectMapper json;
    private final ProcessedEventRepository processed;
    private final BranchClient branchClient;
    private final ManagerProfileService managerProfileService;
    private final StaffProfileService staffProfileService;
    private final CustomerProfileService customerProfileService;
    private final ManagerProfileRepository managerProfileRepository;
    private final StaffProfileRepository staffProfileRepository;
    private final CustomerProfileRepository customerProfileRepository;
    private final StaffRoleAssignmentRepository staffRoleAssignmentRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;

    public UserCreatedV2Listener(ObjectMapper json, ProcessedEventRepository processed,
            BranchClient branchClient,
            ManagerProfileService managerProfileService,
            StaffProfileService staffProfileService,
            CustomerProfileService customerProfileService,
            ManagerProfileRepository managerProfileRepository,
            StaffProfileRepository staffProfileRepository,
            CustomerProfileRepository customerProfileRepository,
            StaffRoleAssignmentRepository staffRoleAssignmentRepository,
            KafkaTemplate<String, String> kafkaTemplate) {
        this.json = json;
        this.processed = processed;
        this.branchClient = branchClient;
        this.managerProfileService = managerProfileService;
        this.staffProfileService = staffProfileService;
        this.customerProfileService = customerProfileService;
        this.managerProfileRepository = managerProfileRepository;
        this.staffProfileRepository = staffProfileRepository;
        this.customerProfileRepository = customerProfileRepository;
        this.staffRoleAssignmentRepository = staffRoleAssignmentRepository;
        this.kafkaTemplate = kafkaTemplate;
    }

    @KafkaListener(topics = "user.created.v2", groupId = "profile-user-v2")
    @Transactional
    public void onUserCreated(String payload) throws Exception {
        System.out.println("=== UserCreatedV2Listener triggered ===");
        System.out.println("Received event: " + payload);
        UserCreatedV2Event evt = json.readValue(payload, UserCreatedV2Event.class);
        System.out.println("Parsed event: " + evt.sagaId + ", userId: " + evt.userId + ", role: " + evt.role);
        if (processed.existsById(evt.sagaId)) {
            System.out.println("Event already processed: " + evt.sagaId);
            return;
        }

        try {
            // Validate branch exists (only for MANAGER and STAFF)
            if (!Objects.equals(evt.role, "CUSTOMER")) {
                try {
                    ApiResponse<?> br = branchClient.getBranchById(evt.branchId);
                    if (br == null || br.getResult() == null) {
                        throw new RuntimeException("BRANCH_NOT_FOUND");
                    }
                } catch (Exception e) {
                    System.err.println("Branch validation failed, continuing anyway: " + e.getMessage());
                    // Continue without branch validation if branch service is down
                }
            }

            // Assign a temporary Authentication so method security passes during background
            // processing
            List<SimpleGrantedAuthority> authorities;
            if (Objects.equals(evt.role, "MANAGER")) {
                authorities = List.of(new SimpleGrantedAuthority("ROLE_ADMIN"));
            } else if (Objects.equals(evt.role, "CUSTOMER")) {
                authorities = List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"));
            } else {
                authorities = List.of(new SimpleGrantedAuthority("ROLE_MANAGER"));
            }
            var systemAuth = new UsernamePasswordAuthenticationToken("system", null, authorities);
            SecurityContextHolder.getContext().setAuthentication(systemAuth);
            // Assign manager first (idempotent). For STAFF we do not assign manager to
            // branch. - DISABLED FOR NOW
            // if (Objects.equals(evt.role, "MANAGER")) {
            //     AssignManagerRequest req = new AssignManagerRequest();
            //     req.setManagerUserId(evt.userId);
            //     branchClient.assignManager(evt.branchId, req);
            // }

            switch (evt.role) {
                case "MANAGER" -> managerProfileService.createManagerProfile(
                        ManagerProfileCreationRequest.builder()
                                .userId(evt.userId)
                                .branchId(evt.branchId)
                                .hireDate(evt.hireDate)
                                .identityCard(evt.identityCard)
                                .build());
                case "STAFF" -> {
                    // Defaults if not provided
                    String employmentType = evt.employmentType != null ? evt.employmentType : "FULL_TIME";
                    String payType = evt.payType != null ? evt.payType
                            : ("FULL_TIME".equals(employmentType) ? "MONTHLY" : "HOURLY");
                    BigDecimal baseSalary = evt.salary != null ? BigDecimal.valueOf(evt.salary) : BigDecimal.ZERO;
                    BigDecimal hourlyRate = evt.hourlyRate != null ? BigDecimal.valueOf(evt.hourlyRate) : BigDecimal.ZERO;
                    BigDecimal overtimeRate = evt.overtimeRate != null ? BigDecimal.valueOf(evt.overtimeRate) : null;

                    staffProfileService.createStaffProfile(
                            StaffProfileCreationRequest.builder()
                                    .userId(evt.userId)
                                    .branchId(evt.branchId)
                                    .identityCard(evt.identityCard)
                                    .hireDate(evt.hireDate)
                                    .baseSalary(baseSalary)
                                    .hourlyRate(hourlyRate)
                                    .overtimeRate(overtimeRate)
                                    .employmentType(employmentType)
                                    .payType(payType)
                                    .build());

                    // After staff profile is created, create staff_role_assignments for business roles (if any)
                    if (evt.staffBusinessRoleIds != null && !evt.staffBusinessRoleIds.isEmpty()) {
                        var staffProfileOpt = staffProfileRepository.findById(evt.userId);
                        staffProfileOpt.ifPresent(staffProfile -> {
                            String level = evt.proficiencyLevel != null ? evt.proficiencyLevel : "INTERMEDIATE";
                            evt.staffBusinessRoleIds.forEach(roleId -> {
                                var assignment = com.service.profile.entity.StaffRoleAssignment.builder()
                                        .staffProfile(staffProfile)
                                        .roleId(roleId)
                                        .proficiencyLevel(level)
                                        .certifiedAt(evt.hireDate)
                                        .build();
                                staffRoleAssignmentRepository.save(assignment);
                            });
                        });
                    }
                }
                case "CUSTOMER" -> customerProfileService.createCustomerProfile(
                        CustomerProfileCreationRequest.builder()
                                .userId(evt.userId)
                                .dob(evt.dob)
                                .avatarUrl(evt.avatarUrl)
                                .bio(evt.bio)
                                .build());
                default -> {
                }
            }

            // publish completed
            try {
                UserProfileCompletedEvent done = new UserProfileCompletedEvent();
                done.sagaId = evt.sagaId;
                done.userId = evt.userId;
                done.occurredAt = Instant.now();
                kafkaTemplate.send("user.profile.completed", json.writeValueAsString(done));
            } catch (Exception ignore) {
            }
        } catch (Exception ex) {
            // Compensation and failure notification - DISABLED FOR NOW
            try {
                if (Objects.equals(evt.role, "MANAGER")) {
                    // AssignManagerRequest undo = new AssignManagerRequest();
                    // undo.setManagerUserId(evt.userId);
                    // branchClient.unassignManager(evt.branchId, undo);
                    // delete manager profile if created
                    try {
                        managerProfileRepository.deleteById(evt.userId);
                    } catch (Exception ignore2) {
                    }
                }
                if (Objects.equals(evt.role, "STAFF")) {
                    try {
                        var staffOpt = staffProfileRepository.findById(evt.userId);
                        staffOpt.ifPresent(sp -> {
                            try {
                                // Xoá hết staff_role_assignments trước
                                staffRoleAssignmentRepository.deleteByStaffProfile(sp);
                            } catch (Exception ignoreAssign) {}
                            try {
                                staffProfileRepository.delete(sp);
                            } catch (Exception ignoreProfile) {}
                        });
                    } catch (Exception ignore3) {
                    }
                }
                if (Objects.equals(evt.role, "CUSTOMER")) {
                    try {
                        customerProfileRepository.deleteById(evt.userId);
                    } catch (Exception ignore4) {
                    }
                }
            } catch (Exception ignore) {
                // swallow compensation errors
            }

            // publish failure event for auth to delete user
            try {
                UserProfileFailedEvent failed = new UserProfileFailedEvent();
                failed.sagaId = evt.sagaId;
                failed.userId = evt.userId;
                Integer code = 9999;
                String reason = ex.getMessage();
                if (ex instanceof FeignException fe) {
                    String content = fe.contentUTF8();
                    try {
                        java.util.Map<?, ?> body = json.readValue(content, java.util.Map.class);
                        Object c = body.get("code");
                        Object m = body.get("message");
                        if (c instanceof Number)
                            code = ((Number) c).intValue();
                        if (m instanceof String s)
                            reason = s;
                    } catch (Exception ignoreParse) {
                    }
                }
                failed.code = code;
                failed.reason = reason;
                failed.occurredAt = Instant.now();
                kafkaTemplate.send("user.profile.failed", json.writeValueAsString(failed));
            } catch (Exception ignore) {
                // ignore publish errors
            }

            System.err.println("Saga compensation executed for sagaId=" + evt.sagaId + ", reason=" + ex.getMessage());
            processed.save(new ProcessedEvent(evt.sagaId, "user.created.v2", Instant.now()));
            return;
        } finally {
            SecurityContextHolder.clearContext();
        }

        processed.save(new ProcessedEvent(evt.sagaId, "user.created.v2", Instant.now()));
    }
}
