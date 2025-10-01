package com.service.profile.events;

import java.time.Instant;

public class UserDeleteRequestedEvent {
    public String sagaId;
    public Integer userId;
    public String role; // MANAGER
    public Instant occurredAt;
}


