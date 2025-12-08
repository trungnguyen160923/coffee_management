package com.service.auth.service;

import java.time.Instant;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.service.auth.dto.request.ManagerProfileCreationRequest;
import com.service.auth.dto.request.StaffProfileCreationRequest;
import com.service.auth.dto.request.CustomerUserCreationRequest;
import com.service.auth.dto.request.StaffUpdateV2Request;
import com.service.auth.entity.User;
import com.service.auth.events.UserCreatedV2Event;
import com.service.auth.outbox.OutboxEvent;
import com.service.auth.outbox.OutboxEventRepository;
import com.service.auth.repository.RoleRepository;
import com.service.auth.repository.UserRepository;
import com.service.auth.repository.http_client.ProfileClient;

@Service
public class UserV2Service {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final OutboxEventRepository outboxRepo;
    private final ObjectMapper json;
    private final ProfileClient profileClient;

    public UserV2Service(UserRepository userRepository, RoleRepository roleRepository,
            PasswordEncoder passwordEncoder, OutboxEventRepository outboxRepo, ObjectMapper json,
            ProfileClient profileClient) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.outboxRepo = outboxRepo;
        this.json = json;
        this.profileClient = profileClient;
    }

    @Transactional
    public Object createManagerUser(ManagerProfileCreationRequest req) {
        System.out.println("=== UserV2Service.createManagerUser called ===");
        // Validate duplicate email
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new RuntimeException("Email already exists");
        }
        User user = new User();
        user.setEmail(req.getEmail());
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        user.setFullname(req.getFullname());
        user.setPhoneNumber(req.getPhoneNumber());
        user.setRole(roleRepository.findByName(req.getRole()).orElseThrow());
        userRepository.save(user);

        UserCreatedV2Event evt = new UserCreatedV2Event();
        evt.sagaId = UUID.randomUUID().toString();
        evt.userId = user.getUserId();
        evt.email = user.getEmail();
        evt.fullname = user.getFullname();
        evt.phoneNumber = user.getPhoneNumber();
        evt.role = req.getRole();
        evt.branchId = req.getBranchId();
        evt.hireDate = req.getHireDate();
        evt.identityCard = req.getIdentityCard();
        evt.occurredAt = Instant.now();

        OutboxEvent ob = new OutboxEvent();
        ob.setId(UUID.randomUUID().toString());
        ob.setAggregateType("USER");
        ob.setAggregateId(String.valueOf(user.getUserId()));
        ob.setType("UserCreatedV2");
        try {
            ob.setPayload(json.writeValueAsString(evt));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        ob.setStatus("NEW");
        ob.setAttempts(0);
        ob.setCreatedAt(Instant.now());
        outboxRepo.save(ob);

        return java.util.Map.of("userId", user.getUserId(), "sagaId", evt.sagaId);
    }

    @Transactional
    public Object createStaffUser(StaffProfileCreationRequest req) {

        if (userRepository.existsByEmail(req.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        User user = new User();
        user.setEmail(req.getEmail());
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        user.setFullname(req.getFullname());
        user.setPhoneNumber(req.getPhoneNumber());
        user.setRole(roleRepository.findByName(req.getRole()).orElseThrow());
        userRepository.save(user);

        UserCreatedV2Event evt = new UserCreatedV2Event();
        evt.sagaId = UUID.randomUUID().toString();
        evt.userId = user.getUserId();
        evt.email = user.getEmail();
        evt.fullname = user.getFullname();
        evt.phoneNumber = user.getPhoneNumber();
        evt.role = req.getRole();
        evt.branchId = req.getBranchId();
        evt.hireDate = req.getHireDate();
        evt.identityCard = req.getIdentityCard();
        evt.salary = req.getSalary() != null ? req.getSalary().doubleValue() : null;

        // New employment & pay structure fields (optional)
        evt.employmentType = req.getEmploymentType();
        evt.payType = req.getPayType();
        evt.hourlyRate = req.getHourlyRate();
        evt.overtimeRate = req.getOvertimeRate();
        evt.staffBusinessRoleIds = req.getStaffBusinessRoleIds();
        evt.proficiencyLevel = req.getProficiencyLevel();
        evt.occurredAt = Instant.now();

        OutboxEvent ob = new OutboxEvent();
        ob.setId(UUID.randomUUID().toString());
        ob.setAggregateType("USER");
        ob.setAggregateId(String.valueOf(user.getUserId()));
        ob.setType("UserCreatedV2");
        try {
            ob.setPayload(json.writeValueAsString(evt));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        ob.setStatus("NEW");
        ob.setAttempts(0);
        ob.setCreatedAt(Instant.now());
        outboxRepo.save(ob);

        return java.util.Map.of("userId", user.getUserId(), "sagaId", evt.sagaId);
    }

    @Transactional
    public Object createCustomerUser(CustomerUserCreationRequest req) {
        System.out.println("=== UserV2Service.createCustomerUser called ===");
        // Validate duplicate email
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new RuntimeException("Email already exists");
        }
        User user = new User();
        user.setEmail(req.getEmail());
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        user.setFullname(req.getFullname());
        user.setPhoneNumber(req.getPhoneNumber());
        user.setRole(roleRepository.findByName(req.getRole()).orElseThrow());
        userRepository.save(user);

        UserCreatedV2Event evt = new UserCreatedV2Event();
        evt.sagaId = UUID.randomUUID().toString();
        evt.userId = user.getUserId();
        evt.email = user.getEmail();
        evt.fullname = user.getFullname();
        evt.phoneNumber = user.getPhoneNumber();
        evt.role = req.getRole();
        evt.dob = req.getDob();
        evt.avatarUrl = req.getAvatarUrl();
        evt.bio = req.getBio();
        evt.occurredAt = Instant.now();

        OutboxEvent ob = new OutboxEvent();
        ob.setId(UUID.randomUUID().toString());
        ob.setAggregateType("USER");
        ob.setAggregateId(String.valueOf(user.getUserId()));
        ob.setType("UserCreatedV2");
        try {
            ob.setPayload(json.writeValueAsString(evt));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        ob.setStatus("NEW");
        ob.setAttempts(0);
        ob.setCreatedAt(Instant.now());
        outboxRepo.save(ob);

        return java.util.Map.of("userId", user.getUserId(), "sagaId", evt.sagaId);
    }

    @Transactional
    public void updateStaffUser(Integer userId, StaffUpdateV2Request req) {
        var user = userRepository.findById(userId).orElseThrow();
        if (user.getRole() == null || user.getRole().getName() == null || !"STAFF".equals(user.getRole().getName())) {
            throw new RuntimeException("USER_NOT_STAFF");
        }

        // Email duplicate check (trừ user hiện tại)
        if (req.getEmail() != null) {
            var existing = userRepository.findByEmail(req.getEmail());
            if (existing.isPresent() && !existing.get().getUserId().equals(userId)) {
                throw new com.service.auth.exception.AppException(com.service.auth.exception.ErrorCode.EMAIL_EXISTED);
            }
            user.setEmail(req.getEmail());
        }

        if (req.getFullname() != null) {
            user.setFullname(req.getFullname());
        }
        if (req.getPhoneNumber() != null) {
            user.setPhoneNumber(req.getPhoneNumber());
        }
        userRepository.save(user);

        // Forward full staff profile update to profile-service
        profileClient.updateStaffProfileFull(userId, req);
    }

    @Transactional
    public Object deleteManagerUser(Integer userId) {
        var user = userRepository.findById(userId).orElseThrow();
        if (user.getRole() == null || user.getRole().getName() == null || !"MANAGER".equals(user.getRole().getName())) {
            throw new RuntimeException("USER_NOT_MANAGER");
        }

        var evt = new com.service.auth.events.UserDeleteRequestedEvent();
        evt.sagaId = java.util.UUID.randomUUID().toString();
        evt.userId = user.getUserId();
        evt.role = "MANAGER";
        evt.occurredAt = java.time.Instant.now();

        OutboxEvent ob = new OutboxEvent();
        ob.setId(java.util.UUID.randomUUID().toString());
        ob.setAggregateType("USER");
        ob.setAggregateId(String.valueOf(user.getUserId()));
        ob.setType("UserDeleteRequestedV1");
        try {
            ob.setPayload(json.writeValueAsString(evt));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        ob.setStatus("NEW");
        ob.setAttempts(0);
        ob.setCreatedAt(java.time.Instant.now());
        outboxRepo.save(ob);

        return java.util.Map.of("userId", user.getUserId(), "sagaId", evt.sagaId);
    }

    @Transactional
    public Object deleteStaffUser(Integer userId) {
        var user = userRepository.findById(userId).orElseThrow();
        if (user.getRole() == null || user.getRole().getName() == null || !"STAFF".equals(user.getRole().getName())) {
            throw new RuntimeException("USER_NOT_STAFF");
        }

        var evt = new com.service.auth.events.UserDeleteRequestedEvent();
        evt.sagaId = java.util.UUID.randomUUID().toString();
        evt.userId = user.getUserId();
        evt.role = "STAFF";
        evt.occurredAt = java.time.Instant.now();

        OutboxEvent ob = new OutboxEvent();
        ob.setId(java.util.UUID.randomUUID().toString());
        ob.setAggregateType("USER");
        ob.setAggregateId(String.valueOf(user.getUserId()));
        ob.setType("UserDeleteRequestedV1");
        try {
            ob.setPayload(json.writeValueAsString(evt));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        ob.setStatus("NEW");
        ob.setAttempts(0);
        ob.setCreatedAt(java.time.Instant.now());
        outboxRepo.save(ob);

        return java.util.Map.of("userId", user.getUserId(), "sagaId", evt.sagaId);
    }

    @Transactional
    public Object deleteCustomerUser(Integer userId) {
        var user = userRepository.findById(userId).orElseThrow();
        if (user.getRole() == null || user.getRole().getName() == null || !"CUSTOMER".equals(user.getRole().getName())) {
            throw new RuntimeException("USER_NOT_CUSTOMER");
        }

        var evt = new com.service.auth.events.UserDeleteRequestedEvent();
        evt.sagaId = java.util.UUID.randomUUID().toString();
        evt.userId = user.getUserId();
        evt.role = "CUSTOMER";
        evt.occurredAt = java.time.Instant.now();

        OutboxEvent ob = new OutboxEvent();
        ob.setId(java.util.UUID.randomUUID().toString());
        ob.setAggregateType("USER");
        ob.setAggregateId(String.valueOf(user.getUserId()));
        ob.setType("UserDeleteRequestedV1");
        try {
            ob.setPayload(json.writeValueAsString(evt));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        ob.setStatus("NEW");
        ob.setAttempts(0);
        ob.setCreatedAt(java.time.Instant.now());
        outboxRepo.save(ob);

        return java.util.Map.of("userId", user.getUserId(), "sagaId", evt.sagaId);
    }
}


