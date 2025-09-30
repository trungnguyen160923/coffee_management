package com.service.profile.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "processed_event")
public class ProcessedEvent {
    @Id
    private String eventId;
    private String eventType;
    private Instant processedAt;

    public ProcessedEvent() {}

    public ProcessedEvent(String eventId, String eventType, Instant processedAt) {
        this.eventId = eventId; this.eventType = eventType; this.processedAt = processedAt;
    }

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }
    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public Instant getProcessedAt() { return processedAt; }
    public void setProcessedAt(Instant processedAt) { this.processedAt = processedAt; }
}


