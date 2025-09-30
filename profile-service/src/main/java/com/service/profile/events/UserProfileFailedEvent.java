package com.service.profile.events;

import java.time.Instant;

public class UserProfileFailedEvent {
    public String sagaId;
    public Integer userId;
    public Integer code;
    public String reason;
    public Instant occurredAt;
}


