package com.service.auth.listeners;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.service.auth.events.UserProfileCompletedEvent;
import com.service.auth.saga.SagaCoordinator;

@Component
public class UserProfileCompletedListener {
    private final ObjectMapper json;
    private final SagaCoordinator coordinator;

    public UserProfileCompletedListener(ObjectMapper json, SagaCoordinator coordinator) {
        this.json = json; this.coordinator = coordinator;
    }

    @KafkaListener(topics = "user.profile.completed", groupId = "auth-user-completed")
    public void onUserProfileCompleted(String payload) throws Exception {
        UserProfileCompletedEvent evt = json.readValue(payload, UserProfileCompletedEvent.class);
        coordinator.complete(evt.sagaId);
    }
}


