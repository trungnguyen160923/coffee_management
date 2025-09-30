package com.service.profile.events;

import java.time.Instant;

public class UserProfileCompletedEvent {
    public String sagaId;
    public Integer userId;
    public Instant occurredAt;
}


