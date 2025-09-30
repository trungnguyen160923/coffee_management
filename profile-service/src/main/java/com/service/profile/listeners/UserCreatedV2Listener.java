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
import com.service.profile.dto.request.AssignManagerRequest;
import com.service.profile.dto.request.ManagerProfileCreationRequest;
import com.service.profile.dto.request.StaffProfileCreationRequest;
import com.service.profile.entity.ProcessedEvent;
import com.service.profile.events.UserCreatedV2Event;
import com.service.profile.events.UserProfileFailedEvent;
import com.service.profile.events.UserProfileCompletedEvent;
import com.service.profile.repository.ProcessedEventRepository;
import com.service.profile.repository.http_client.BranchClient;
import com.service.profile.repository.ManagerProfileRepository;
import com.service.profile.repository.StaffProfileRepository;
import com.service.profile.service.ManagerProfileService;
import com.service.profile.service.StaffProfileService;

import java.time.Instant;
import java.util.List;
import java.util.Objects;

@Component
public class UserCreatedV2Listener {
    private final ObjectMapper json;
    private final ProcessedEventRepository processed;
    private final BranchClient branchClient;
    private final ManagerProfileService managerProfileService;
    private final StaffProfileService staffProfileService;
    private final ManagerProfileRepository managerProfileRepository;
    private final StaffProfileRepository staffProfileRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;

    public UserCreatedV2Listener(ObjectMapper json, ProcessedEventRepository processed,
                                 BranchClient branchClient,
                                 ManagerProfileService managerProfileService,
                                 StaffProfileService staffProfileService,
                                 ManagerProfileRepository managerProfileRepository,
                                 StaffProfileRepository staffProfileRepository,
                                 KafkaTemplate<String, String> kafkaTemplate) {
        this.json = json; this.processed = processed; this.branchClient = branchClient;
        this.managerProfileService = managerProfileService; this.staffProfileService = staffProfileService;
        this.managerProfileRepository = managerProfileRepository; this.staffProfileRepository = staffProfileRepository;
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
            // Validate branch exists
            ApiResponse<?> br = branchClient.getBranchById(evt.branchId);
            if (br == null || br.getResult() == null) {
                throw new RuntimeException("BRANCH_NOT_FOUND");
            }

            // Assign a temporary Authentication so method security passes during background processing
            List<SimpleGrantedAuthority> authorities = Objects.equals(evt.role, "MANAGER")
                    ? List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
                    : List.of(new SimpleGrantedAuthority("ROLE_MANAGER"));
            var systemAuth = new UsernamePasswordAuthenticationToken("system", null, authorities);
            SecurityContextHolder.getContext().setAuthentication(systemAuth);
            // Assign manager first (idempotent). For STAFF we do not assign manager to branch.
            if (Objects.equals(evt.role, "MANAGER")) {
                AssignManagerRequest req = new AssignManagerRequest();
                req.setManagerUserId(evt.userId);
                branchClient.assignManager(evt.branchId, req);
            }

            switch (evt.role) {
                case "MANAGER" -> managerProfileService.createManagerProfile(
                    ManagerProfileCreationRequest.builder()
                        .userId(evt.userId)
                        .branchId(evt.branchId)
                        .hireDate(evt.hireDate)
                        .identityCard(evt.identityCard)
                        .build()
                );
                case "STAFF" -> staffProfileService.createStaffProfile(
                    StaffProfileCreationRequest.builder()
                        .userId(evt.userId)
                        .branchId(evt.branchId)
                        .identityCard(evt.identityCard)
                        .position(evt.position)
                        .hireDate(evt.hireDate)
                        .salary(java.math.BigDecimal.valueOf(evt.salary))
                        .build()
                );
                default -> {}
            }

            // publish completed
            try {
                UserProfileCompletedEvent done = new UserProfileCompletedEvent();
                done.sagaId = evt.sagaId;
                done.userId = evt.userId;
                done.occurredAt = Instant.now();
                kafkaTemplate.send("user.profile.completed", json.writeValueAsString(done));
            } catch (Exception ignore) {}
        } catch (Exception ex) {
            // Compensation and failure notification
            try {
                if (Objects.equals(evt.role, "MANAGER")) {
                    AssignManagerRequest undo = new AssignManagerRequest();
                    undo.setManagerUserId(evt.userId);
                    branchClient.unassignManager(evt.branchId, undo);
                    // delete manager profile if created
                    try { managerProfileRepository.deleteById(evt.userId); } catch (Exception ignore2) {}
                }
                if (Objects.equals(evt.role, "STAFF")) {
                    try { staffProfileRepository.deleteById(evt.userId); } catch (Exception ignore3) {}
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
                        java.util.Map<?,?> body = json.readValue(content, java.util.Map.class);
                        Object c = body.get("code");
                        Object m = body.get("message");
                        if (c instanceof Number) code = ((Number) c).intValue();
                        if (m instanceof String s) reason = s;
                    } catch (Exception ignoreParse) {}
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


