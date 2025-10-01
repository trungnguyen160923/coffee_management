package com.service.auth.listeners;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.service.auth.events.UserDeleteProfileCompletedEvent;
import com.service.auth.repository.UserRepository;
import com.service.auth.saga.SagaCoordinator;

@Component
public class UserDeleteProfileCompletedListener {
    private final ObjectMapper json;
    private final UserRepository userRepository;
    private final SagaCoordinator coordinator;

    public UserDeleteProfileCompletedListener(ObjectMapper json, UserRepository userRepository, SagaCoordinator coordinator) {
        this.json = json; this.userRepository = userRepository; this.coordinator = coordinator;
    }

    @KafkaListener(topics = "user.delete.profile.completed.v1", groupId = "auth-user-delete-completed")
    @Transactional
    public void onUserDeleteProfileCompleted(String payload) throws Exception {
        UserDeleteProfileCompletedEvent evt = json.readValue(payload, UserDeleteProfileCompletedEvent.class);
        if (evt.userId != null) {
            try {
                userRepository.deleteById(evt.userId);
            } catch (Exception ignore) {}
        }
        coordinator.complete(evt.sagaId);
    }
}


