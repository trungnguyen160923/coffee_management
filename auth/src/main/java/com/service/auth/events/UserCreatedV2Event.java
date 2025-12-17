package com.service.auth.events;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public class UserCreatedV2Event {
    public String sagaId;
    public Integer userId;
    public String email;
    public String fullname;
    public String phoneNumber;
    public String role;           // MANAGER|STAFF|CUSTOMER

    // Common for branch assignment
    public Integer branchId;      // required for MANAGER/STAFF

    // Manager/Staff common fields
    public LocalDate hireDate;    // required for MANAGER/STAFF
    public String identityCard;   // required for MANAGER/STAFF

    // Manager-only payroll fields
    public Double baseSalary;           // base monthly salary for MANAGER
    public Double insuranceSalary;      // insurance salary for MANAGER (usually derived from baseSalary)
    public Integer numberOfDependents;  // dependents for MANAGER

    // Staff-only fields
    public Double salary;         // base monthly salary (legacy, STAFF)

    // New staff employment/pay fields
    public String employmentType; // FULL_TIME / PART_TIME / CASUAL
    public String payType;        // MONTHLY / HOURLY
    public Double hourlyRate;
    public Double overtimeRate;
    public List<Integer> staffBusinessRoleIds; // optional business roles
    public String proficiencyLevel;            // BEGINNER / INTERMEDIATE / ADVANCED / EXPERT

    // Customer fields
    public LocalDate dob;         // required for CUSTOMER
    public String avatarUrl;      // optional for CUSTOMER
    public String bio;            // optional for CUSTOMER

    public Instant occurredAt;
}
