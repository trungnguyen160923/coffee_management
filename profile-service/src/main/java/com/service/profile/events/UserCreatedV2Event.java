package com.service.profile.events;

import java.time.Instant;
import java.time.LocalDate;

public class UserCreatedV2Event {
    public String sagaId;
    public Integer userId;
    public String email;
    public String fullname;
    public String phoneNumber;
    public String role;
    public Integer branchId;
    public LocalDate hireDate;
    public String identityCard;
    public String position;
    public Double salary;
    
    // Customer fields
    public LocalDate dob;
    public String avatarUrl;
    public String bio;
    
    public Instant occurredAt;
}


