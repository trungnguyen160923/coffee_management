package com.service.auth.listeners;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.service.auth.events.UserProfileFailedEvent;
import com.service.auth.repository.UserRepository;
import com.service.auth.saga.SagaCoordinator;

@Component
public class UserProfileFailedListener {
    private final ObjectMapper json;
    private final UserRepository userRepository;
    private final SagaCoordinator coordinator;

    public UserProfileFailedListener(ObjectMapper json, UserRepository userRepository, SagaCoordinator coordinator) {
        this.json = json; this.userRepository = userRepository; this.coordinator = coordinator;
    }

    @KafkaListener(topics = "user.profile.failed", groupId = "auth-user-failed")
    @Transactional
    public void onUserProfileFailed(String payload) throws Exception {
        UserProfileFailedEvent evt = json.readValue(payload, UserProfileFailedEvent.class);
        if (evt.userId != null) {
            try {
                userRepository.deleteById(evt.userId);
            } catch (Exception ignore) {
                // ignore delete errors
            }
        }
        String reason = evt.reason;
        if (evt.code != null && evt.code != 9999) {
            reason = evt.reason;
        }
        coordinator.fail(evt.sagaId, reason);
    }
}


