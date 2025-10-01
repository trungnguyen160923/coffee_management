package com.service.profile.events;

import java.time.Instant;

public class UserDeleteProfileCompletedEvent {
    public String sagaId;
    public Integer userId;
    public Instant occurredAt;
}


