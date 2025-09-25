package com.service.auth.service;

import com.service.auth.dto.request.CustomerProfileCreationRequest;
import com.service.auth.dto.request.UserCreationRequest;
import com.service.auth.dto.request.UserUpdateRequest;
import com.service.auth.dto.response.UserResponse;
import com.service.auth.exception.AppException;
import com.service.auth.exception.ErrorCode;
import com.service.auth.mapper.UserMapper;
import com.service.auth.repository.RoleRepository;
import com.service.auth.repository.UserRepository;
import com.service.auth.repository.http_client.ProfileClient;
import com.service.auth.constant.PredefinedRole;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDate;
import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserService {
    UserRepository userRepository;
    PasswordEncoder passwordEncoder;
    UserMapper userMapper;
    RoleRepository roleRepository;
    ProfileClient profileClient;

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public UserResponse createUser(UserCreationRequest request){
        if (userRepository.existsByEmail(request.getEmail())) throw new AppException(ErrorCode.EMAIL_EXISTED);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getAuthorities() == null || auth.getAuthorities().isEmpty()) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        String currentUserRole = auth.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "");
        String targetRoleName = request.getRole();

        // Authorization matrix for creating users
        boolean allowed = switch (currentUserRole) {
            case PredefinedRole.ADMIN_ROLE ->
                    PredefinedRole.MANAGER_ROLE.equals(targetRoleName) || PredefinedRole.STAFF_ROLE.equals(targetRoleName);
            case PredefinedRole.MANAGER_ROLE ->
                    PredefinedRole.STAFF_ROLE.equals(targetRoleName);
            default -> false;
        };

        if (!allowed) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        var user = userMapper.toUser(request);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(roleRepository.findByName(targetRoleName).orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND)));
        userRepository.save(user);

        return userMapper.toUserCreationResponse(user);
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Transactional(readOnly = true)
    public List<UserResponse> getAllStaffs() {
        return userRepository.findAll()
            .stream()
            .filter(user -> {
                // Force role to be loaded to avoid proxy serialization issues
                var role = user.getRole();
                return role != null && PredefinedRole.STAFF_ROLE.equals(role.getName());
            })
            .map(userMapper::toUserCreationResponse)
            .toList();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public List<UserResponse> getAllCustomers() {
        return userRepository.findAll()
            .stream()
            .filter(user -> {
                var role = user.getRole();
                return role != null && PredefinedRole.CUSTOMER_ROLE.equals(role.getName());
            })
            .map(userMapper::toUserCreationResponse)
            .toList();
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or @userService.canUpdateUser(#userId, authentication)")
    @Transactional
    public UserResponse updateUser(Integer userId, UserUpdateRequest request) {
        var user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        // Check permissions
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentUserRole = auth.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "");
        String targetUserRole = user.getRole().getName();

        // MANAGER can only update STAFF users
        if ("MANAGER".equals(currentUserRole) && !"STAFF".equals(targetUserRole)) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        // Check if email already exists for another user
        var existingUser = userRepository.findByEmail(request.getEmail());
        if (existingUser.isPresent() && !existingUser.get().getUserId().equals(userId)) {
            throw new AppException(ErrorCode.EMAIL_EXISTED);
        }

        // Update user fields
        if(request.getEmail() != null) {
            user.setEmail(request.getEmail());
        }
        if(request.getFullname() != null) {
            user.setFullname(request.getFullname());
        }
        if(request.getPhone_number() != null) {
            user.setPhoneNumber(request.getPhone_number());
        }

        // Only ADMIN can change role
        if ("ADMIN".equals(currentUserRole)) {
            if(request.getRole() != null) {
                var newRole = roleRepository.findByName(request.getRole())
                        .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));
                user.setRole(newRole);
            }
        }

        userRepository.save(user);
        return userMapper.toUserCreationResponse(user);
    }

    public boolean canUpdateUser(Integer userId, Authentication authentication) {
        if (authentication == null) return false;
        
        String currentUserEmail = authentication.getName();
        var currentUser = userRepository.findByEmail(currentUserEmail);
        
        return currentUser.isPresent() && currentUser.get().getUserId().equals(userId);
    }

    public UserResponse createCustomer(UserCreationRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) throw new AppException(ErrorCode.EMAIL_EXISTED);

        var user = userMapper.toUser(request);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(roleRepository.findByName(PredefinedRole.CUSTOMER_ROLE).orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND)));
        userRepository.save(user);
        
        CustomerProfileCreationRequest customerProfileCreationRequest = CustomerProfileCreationRequest.builder()
                .userId(user.getUserId())
                .dob(request.getDob())
                .avatarUrl(request.getAvatarUrl())
                .bio(request.getBio())
                .build();
        profileClient.createProfile(customerProfileCreationRequest);
        return userMapper.toUserCreationResponse(user);
    }

}
