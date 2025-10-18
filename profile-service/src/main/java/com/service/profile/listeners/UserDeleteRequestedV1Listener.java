package com.service.profile.listeners;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.service.profile.dto.ApiResponse;
import com.service.profile.dto.response.BranchResponse;
import com.service.profile.events.UserDeleteRequestedEvent;
import com.service.profile.exception.AppException;
import com.service.profile.exception.ErrorCode;
import com.service.profile.events.UserDeleteProfileCompletedEvent;
import com.service.profile.events.UserDeleteFailedEvent;
import com.service.profile.repository.ManagerProfileRepository;
import com.service.profile.repository.StaffProfileRepository;
import com.service.profile.repository.http_client.BranchClient;

import java.time.Instant;
import java.util.List;

@Component
public class UserDeleteRequestedV1Listener {
    private final ObjectMapper json;
    private final BranchClient branchClient;
    private final ManagerProfileRepository managerProfileRepository;
    private final StaffProfileRepository staffProfileRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;

    public UserDeleteRequestedV1Listener(ObjectMapper json,
                                         BranchClient branchClient,
                                         ManagerProfileRepository managerProfileRepository,
                                         StaffProfileRepository staffProfileRepository,
                                         KafkaTemplate<String, String> kafkaTemplate) {
        this.json = json; this.branchClient = branchClient; this.managerProfileRepository = managerProfileRepository; this.staffProfileRepository = staffProfileRepository; this.kafkaTemplate = kafkaTemplate;
    }

    @KafkaListener(topics = "user.delete.requested.v1", groupId = "profile-user-delete-v1")
    // @Transactional
    public void onUserDeleteRequested(String payload) throws Exception {
        UserDeleteRequestedEvent evt = json.readValue(payload, UserDeleteRequestedEvent.class);
        try {
            // Assign temporary ADMIN authentication so method security passes during
            // background processing
            var systemAuth = new UsernamePasswordAuthenticationToken(
                    "system", null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
            SecurityContextHolder.getContext().setAuthentication(systemAuth);

            if ("MANAGER".equalsIgnoreCase(evt.role)) {
                ApiResponse<List<BranchResponse>> resp = branchClient.getBranchesByManagerInternal(evt.userId);
                List<BranchResponse> branches = resp != null ? resp.getResult() : null;
                if (branches != null && !branches.isEmpty()) {
                    throw new AppException(ErrorCode.MANAGER_ASSIGNED_TO_BRANCH);
                }
                try { managerProfileRepository.deleteById(evt.userId); } catch (Exception ignore) {}
            } else if ("STAFF".equalsIgnoreCase(evt.role)) {
                try { staffProfileRepository.deleteById(evt.userId); } catch (Exception ignore) {}
            }

            UserDeleteProfileCompletedEvent done = new UserDeleteProfileCompletedEvent();
            done.sagaId = evt.sagaId; done.userId = evt.userId; done.occurredAt = Instant.now();
            kafkaTemplate.send("user.delete.profile.completed.v1", json.writeValueAsString(done));
        } catch (Exception ex) {
            // UserDeleteFailedEvent failed = new UserDeleteFailedEvent();
            // failed.sagaId = evt.sagaId;
            // failed.userId = evt.userId;
            // failed.code = 400;
            // failed.reason = ex.getMessage();
            // failed.occurredAt = Instant.now();
            // kafkaTemplate.send("user.delete.failed.v1", json.writeValueAsString(failed));
        } finally {
            SecurityContextHolder.clearContext();
        }
    }
}
