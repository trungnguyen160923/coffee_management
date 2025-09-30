package com.service.auth.events;

import java.time.Instant;
import java.time.LocalDate;

public class UserCreatedV2Event {
    public String sagaId;
    public Integer userId;
    public String email;
    public String fullname;
    public String phoneNumber;
    public String role;           // MANAGER|STAFF

    // Common for branch assignment
    public Integer branchId;      // required for MANAGER/STAFF

    // Manager fields
    public LocalDate hireDate;    // required for MANAGER/STAFF
    public String identityCard;   // required for MANAGER/STAFF

    // Staff fields
    public String position;       // required for STAFF
    public Double salary;         // required for STAFF

    public Instant occurredAt;
}


