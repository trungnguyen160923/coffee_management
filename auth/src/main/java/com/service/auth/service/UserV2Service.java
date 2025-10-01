package com.service.auth.service;

import java.time.Instant;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.service.auth.dto.request.ManagerProfileCreationRequest;
import com.service.auth.dto.request.StaffProfileCreationRequest;
import com.service.auth.entity.User;
import com.service.auth.events.UserCreatedV2Event;
import com.service.auth.outbox.OutboxEvent;
import com.service.auth.outbox.OutboxEventRepository;
import com.service.auth.repository.RoleRepository;
import com.service.auth.repository.UserRepository;

@Service
public class UserV2Service {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final OutboxEventRepository outboxRepo;
    private final ObjectMapper json;

    public UserV2Service(UserRepository userRepository, RoleRepository roleRepository,
            PasswordEncoder passwordEncoder, OutboxEventRepository outboxRepo, ObjectMapper json) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.outboxRepo = outboxRepo;
        this.json = json;
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
        evt.position = req.getPosition();
        evt.salary = req.getSalary().doubleValue();
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
}


