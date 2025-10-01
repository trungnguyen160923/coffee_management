package com.service.auth.events;

import java.time.Instant;

public class UserDeleteRequestedEvent {
    public String sagaId;
    public Integer userId;
    public String role; // MANAGER only for this flow
    public Instant occurredAt;
}


