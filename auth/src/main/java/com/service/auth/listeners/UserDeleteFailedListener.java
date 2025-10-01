package com.service.auth.listeners;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.service.auth.events.UserDeleteFailedEvent;
import com.service.auth.saga.SagaCoordinator;

@Component
public class UserDeleteFailedListener {
    private final ObjectMapper json;
    private final SagaCoordinator coordinator;

    public UserDeleteFailedListener(ObjectMapper json, SagaCoordinator coordinator) {
        this.json = json; this.coordinator = coordinator;
    }

    @KafkaListener(topics = "user.delete.failed.v1", groupId = "auth-user-delete-failed")
    public void onUserDeleteFailed(String payload) throws Exception {
        UserDeleteFailedEvent evt = json.readValue(payload, UserDeleteFailedEvent.class);
        String reason = evt.reason;
        coordinator.fail(evt.sagaId, reason);
    }
}


