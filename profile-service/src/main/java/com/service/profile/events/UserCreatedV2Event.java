package com.service.profile.events;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

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

    // Manager-only payroll fields
    public Double baseSalary;           // base monthly salary for MANAGER
    public Double insuranceSalary;      // insurance salary for MANAGER
    public Integer numberOfDependents;  // dependents for MANAGER

    public Double salary;               // legacy base salary for STAFF

    // New staff employment & pay fields
    public String employmentType; // FULL_TIME / PART_TIME / CASUAL
    public String payType;        // MONTHLY / HOURLY
    public Double hourlyRate;
    public Double overtimeRate;
    public List<Integer> staffBusinessRoleIds;
    public String proficiencyLevel;
    
    // Customer fields
    public LocalDate dob;
    public String avatarUrl;
    public String bio;
    
    public Instant occurredAt;
}
