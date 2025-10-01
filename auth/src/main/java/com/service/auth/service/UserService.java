package com.service.auth.service;

import com.service.auth.dto.request.CustomerProfileCreationRequest;
import com.service.auth.dto.request.ManagerProfileCreationRequest;
import com.service.auth.dto.request.ManagerProfileRequest;
import com.service.auth.dto.request.StaffProfileCreationRequest;
import com.service.auth.dto.request.StaffProfileRequest;
import com.service.auth.dto.request.UserCreationRequest;
import com.service.auth.dto.request.UserUpdateRequest;
import com.service.auth.dto.response.AdminProfileResponse;
import com.service.auth.dto.response.ApiResponse;
import com.service.auth.dto.response.CustomerProfileResponse;
import com.service.auth.dto.response.ManagerProfileResponse;
import com.service.auth.dto.response.StaffProfileResponse;
import com.service.auth.dto.response.PagedResponse;
import com.service.auth.dto.response.UserResponse;
import com.service.auth.entity.User;
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

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
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

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ApiResponse<ManagerProfileResponse> createManagerProfile(ManagerProfileCreationRequest request) {
        if (userRepository.existsByEmail(request.getEmail()))
            throw new AppException(ErrorCode.EMAIL_EXISTED);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getAuthorities() == null || auth.getAuthorities().isEmpty()) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        String currentUserRole = auth.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "");
        String targetRoleName = request.getRole();

        // Authorization matrix for creating users
        boolean allowed = canCreateStaff(currentUserRole, targetRoleName);

        if (!allowed) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        // Create user first
        User user = userMapper.toUser_Manager(request);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(roleRepository.findByName(targetRoleName)
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND)));
        userRepository.save(user);

        // Create manager profile
        ManagerProfileResponse managerProfile = ManagerProfileResponse.builder()
                .userId(user.getUserId())
                .email(user.getEmail())
                .fullname(user.getFullname())
                .phone_number(user.getPhoneNumber())
                .role(user.getRole())
                .hireDate(request.getHireDate())
                .build();

        ManagerProfileRequest managerProfileRequest = ManagerProfileRequest.builder()
                .userId(user.getUserId())
                .branchId(request.getBranchId())
                .hireDate(request.getHireDate())
                .identityCard(request.getIdentityCard())
                .build();

        profileClient.createManagerProfile(managerProfileRequest);
        return ApiResponse.<ManagerProfileResponse>builder()
                .result(managerProfile)
                .build();
    }

    @PreAuthorize("hasRole('MANAGER')")
    @Transactional
    public ApiResponse<StaffProfileResponse> createStaffProfile(StaffProfileCreationRequest request) {
        if (userRepository.existsByEmail(request.getEmail()))
            throw new AppException(ErrorCode.EMAIL_EXISTED);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getAuthorities() == null || auth.getAuthorities().isEmpty()) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        String currentUserRole = auth.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "");
        String targetRoleName = request.getRole();

        // Authorization matrix for creating users
        boolean allowed = canCreateStaff(currentUserRole, targetRoleName);

        if (!allowed) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        // Create user first
        var user = userMapper.toUser_Staff(request);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(roleRepository.findByName(targetRoleName)
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND)));
        userRepository.save(user);

        // Create staff profile
        StaffProfileResponse staffProfile = StaffProfileResponse.builder()
                .userId(user.getUserId())
                .email(user.getEmail())
                .fullname(user.getFullname())
                .phone_number(user.getPhoneNumber())
                .role(user.getRole())
                .identityCard(request.getIdentityCard())
                .hireDate(request.getHireDate())
                .position(request.getPosition())
                .salary(request.getSalary())
                .build();

        StaffProfileRequest staffProfileRequest = StaffProfileRequest.builder()
                .userId(user.getUserId())
                .branchId(request.getBranchId())
                .hireDate(request.getHireDate())
                .identityCard(request.getIdentityCard())
                .position(request.getPosition())
                .salary(BigDecimal.valueOf(request.getSalary()))
                .build();
        profileClient.createStaffProfile(staffProfileRequest);
        return ApiResponse.<StaffProfileResponse>builder()
                .result(staffProfile)
                .build();
    }

    private boolean canCreateStaff(String currentUserRole, String targetRoleName) {
        return switch (currentUserRole) {
            case PredefinedRole.ADMIN_ROLE ->
                PredefinedRole.MANAGER_ROLE.equals(targetRoleName) || PredefinedRole.STAFF_ROLE.equals(targetRoleName);
            case PredefinedRole.MANAGER_ROLE ->
                PredefinedRole.STAFF_ROLE.equals(targetRoleName);
            default -> false;
        };
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Transactional(readOnly = true)
    public List<UserResponse> getAllStaffs() {
        try {
            List<StaffProfileResponse> staffProfiles = profileClient.getAllStaffProfiles().getResult();
            List<User> users = userRepository.findByRoleName(PredefinedRole.STAFF_ROLE);

            java.util.Map<Integer, StaffProfileResponse> staffByUserId = staffProfiles
                .stream()
                .collect(java.util.stream.Collectors.toMap(StaffProfileResponse::getUserId, java.util.function.Function.identity(), (a, b) -> a));

            List<UserResponse> userResponses = users.stream()
                .map(userMapper::toUserResponse)
                .peek(ur -> {
                    StaffProfileResponse sp = staffByUserId.get(ur.getUser_id());
                    if (sp != null) {
                        ur.setIdentityCard(sp.getIdentityCard());
                        ur.setBranch(sp.getBranch());
                        ur.setHireDate(sp.getHireDate());
                        ur.setPosition(sp.getPosition());
                        ur.setSalary(sp.getSalary());
                    }
                })
                .toList();

            return userResponses;
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
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
                .map(userMapper::toUserResponse)
                .toList();
    }


    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public List<UserResponse> getAllManagers() {

        try {
            List<ManagerProfileResponse> managerProfiles = profileClient.getAllManagerProfiles().getResult();
            List<User> users = userRepository.findByRoleName(PredefinedRole.MANAGER_ROLE);

            java.util.Map<Integer, ManagerProfileResponse> managerByUserId = managerProfiles
                .stream()
                .collect(java.util.stream.Collectors.toMap(ManagerProfileResponse::getUserId, java.util.function.Function.identity(), (a, b) -> a));

            List<UserResponse> userResponses = users.stream()
                .map(userMapper::toUserResponse)
                .peek(ur -> {
                    ManagerProfileResponse mgr = managerByUserId.get(ur.getUser_id());
                    if (mgr != null) {
                        ur.setIdentityCard(mgr.getIdentityCard());
                        ur.setBranch(mgr.getBranch());
                        ur.setHireDate(mgr.getHireDate());
                    }
                })
                .toList();

            return userResponses;
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
        
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public UserResponse getManagerById(Integer userId) {
        try {
            ManagerProfileResponse managerProfile = profileClient.getManagerProfile(userId).getResult();
            UserResponse userResponse = userMapper.toUserResponse(userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_ID_NOT_FOUND)));
            userResponse.setIdentityCard(managerProfile.getIdentityCard());
            userResponse.setBranch(managerProfile.getBranch());
            userResponse.setHireDate(managerProfile.getHireDate());
            return userResponse;
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }

    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public PagedResponse<UserResponse> getManagersPaged(int page, int size) {
        try {
            int safePage = Math.max(page, 0);
            int safeSize = size <= 0 ? 10 : Math.min(size, 100);

            Pageable pageable = PageRequest.of(safePage, safeSize, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createAt"));
            Page<User> userPage = userRepository.findByRoleName(PredefinedRole.MANAGER_ROLE, pageable);

            // Reuse profile service bulk call if ever added; currently fetch all and map
            List<ManagerProfileResponse> managerProfiles = profileClient.getAllManagerProfiles().getResult();
            Map<Integer, ManagerProfileResponse> managerByUserId = managerProfiles
                .stream()
                .collect(java.util.stream.Collectors.toMap(ManagerProfileResponse::getUserId, java.util.function.Function.identity(), (a, b) -> a));

            List<UserResponse> data = userPage.getContent()
                .stream()
                .map(userMapper::toUserResponse)
                .peek(ur -> {
                    ManagerProfileResponse mgr = managerByUserId.get(ur.getUser_id());
                    if (mgr != null) {
                        ur.setIdentityCard(mgr.getIdentityCard());
                        ur.setBranch(mgr.getBranch());
                        ur.setHireDate(mgr.getHireDate());
                    }
                })
                .toList();

            return PagedResponse.<UserResponse>builder()
                .data(data)
                .total(userPage.getTotalElements())
                .page(userPage.getNumber())
                .size(userPage.getSize())
                .totalPages(userPage.getTotalPages())
                .build();
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or @userService.canUpdateUser(#userId, authentication)")
    @Transactional
    public UserResponse updateUser(Integer userId, UserUpdateRequest request) {
        var user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.EMAIL_NOT_EXISTED));

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
        if (request.getEmail() != null) {
            user.setEmail(request.getEmail());
        }
        if (request.getFullname() != null) {
            user.setFullname(request.getFullname());
        }
        if (request.getPhone_number() != null) {
            user.setPhoneNumber(request.getPhone_number());
        }

        // Only ADMIN can change role
        // if ("ADMIN".equals(currentUserRole)) {
        //     if (request.getRole() != null) {
        //         var newRole = roleRepository.findByName(request.getRole())
        //                 .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));
        //         user.setRole(newRole);
        //     }
        // }

        userRepository.save(user);
        return userMapper.toUserResponse(user);
    }

    public boolean canUpdateUser(Integer userId, Authentication authentication) {
        if (authentication == null)
            return false;

        String currentUserEmail = authentication.getName();
        var currentUser = userRepository.findByEmail(currentUserEmail);

        return currentUser.isPresent() && currentUser.get().getUserId().equals(userId);
    }

    @Transactional(readOnly = true)
    public UserResponse getUserById(Integer userId) {
        var user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.EMAIL_NOT_EXISTED));
        return userMapper.toUserResponse(user);
    }

    public UserResponse createCustomer(UserCreationRequest request) {
        if (userRepository.existsByEmail(request.getEmail()))
            throw new AppException(ErrorCode.EMAIL_EXISTED);

        var user = userMapper.toUser(request);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(roleRepository.findByName(PredefinedRole.CUSTOMER_ROLE)
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND)));
        userRepository.save(user);

        CustomerProfileCreationRequest customerProfileCreationRequest = CustomerProfileCreationRequest.builder()
                .userId(user.getUserId())
                .dob(request.getDob())
                .avatarUrl(request.getAvatarUrl())
                .bio(request.getBio())
                .build();
        ApiResponse<CustomerProfileResponse> profileResp = profileClient.createProfile(customerProfileCreationRequest);
        CustomerProfileResponse profile = profileResp.getResult();
        UserResponse userResponse = userMapper.toUserResponse(user);
        userResponse.setDob(profile.getDob());
        userResponse.setAvatarUrl(profile.getAvatarUrl());
        userResponse.setBio(profile.getBio());
        return userResponse;
    }

    public UserResponse getMe() {
        // Get current user from SecurityContext
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        
        // Extract userId from JWT token claims
        Integer userId;
        if (auth.getPrincipal() instanceof Jwt jwt) {
            // Get user_id from JWT claims (it's stored as Long, convert to Integer)
            Long userIdLong = jwt.getClaim("user_id");
            if (userIdLong != null) {
                userId = userIdLong.intValue();
            } else {
                throw new AppException(ErrorCode.UNAUTHENTICATED);
            }
        } else {
            // Fallback: try to get from authorities or other sources
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        
        UserResponse user = userMapper.toUserResponse(userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_ID_NOT_FOUND)));
        
        

        if(user.getRole().getName().equals(PredefinedRole.CUSTOMER_ROLE)) {
            CustomerProfileResponse customerProfile = profileClient.getCustomerProfile(userId).getResult();
            user.setDob(customerProfile.getDob());
            user.setAvatarUrl(customerProfile.getAvatarUrl());
            user.setBio(customerProfile.getBio());
        }
        else if(user.getRole().getName().equals(PredefinedRole.MANAGER_ROLE)) {
            ManagerProfileResponse managerProfile = profileClient.getManagerProfile(userId).getResult();
            user.setIdentityCard(managerProfile.getIdentityCard());
            user.setBranch(managerProfile.getBranch());
            user.setHireDate(managerProfile.getHireDate());
        }
        else if(user.getRole().getName().equals(PredefinedRole.STAFF_ROLE)) {
            StaffProfileResponse staffProfile = profileClient.getStaffProfile(userId).getResult();
            user.setIdentityCard(staffProfile.getIdentityCard());
            user.setBranch(staffProfile.getBranch());
            user.setHireDate(staffProfile.getHireDate());
            user.setPosition(staffProfile.getPosition());
            user.setSalary(staffProfile.getSalary());
        }
        else if(user.getRole().getName().equals(PredefinedRole.ADMIN_ROLE)) {
            AdminProfileResponse adminProfile = profileClient.getAdminProfile(userId).getResult();
            user.setAdminLevel(adminProfile.getAdminLevel());
            user.setNotes(adminProfile.getNotes());
        }
        else {
            throw new AppException(ErrorCode.ROLE_NOT_FOUND);
        }

        return user;
    }

}
