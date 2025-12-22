package com.service.profile.service;

import com.service.profile.dto.request.StaffProfileCreationRequest;
import com.service.profile.dto.request.StaffProfileUpdateRequest;
import com.service.profile.dto.request.StaffProfileFullUpdateRequest;
import com.service.profile.dto.response.BranchResponse;
import com.service.profile.dto.response.StaffProfileResponse;
import com.service.profile.dto.response.StaffWithUserResponse;
import com.service.profile.dto.response.UserResponse;
import com.service.profile.entity.StaffProfile;
import com.service.profile.entity.StaffRoleAssignment;
import com.service.profile.exception.AppException;
import com.service.profile.exception.ErrorCode;
import com.service.profile.mapper.StaffProfileMapper;
import com.service.profile.repository.StaffProfileRepository;
import com.service.profile.repository.StaffRoleAssignmentRepository;
import com.service.profile.repository.http_client.AuthClient;
import com.service.profile.repository.http_client.BranchClient;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import jakarta.transaction.Transactional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDateTime;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class StaffProfileService {
    StaffProfileRepository staffProfileRepository;
    StaffProfileMapper staffProfileMapper;
    BranchClient branchClient;
    AuthClient authClient;
    StaffRoleAssignmentRepository staffRoleAssignmentRepository;

    @Transactional
    @PreAuthorize("hasRole('MANAGER')")
    public StaffProfileResponse createStaffProfile(StaffProfileCreationRequest request){
        StaffProfile staffProfile = staffProfileMapper.toStaffProfile(request);
        staffProfile.setCreateAt(LocalDateTime.now());
        staffProfile.setUpdateAt(LocalDateTime.now());
        staffProfileRepository.save(staffProfile);
        StaffProfileResponse response = staffProfileMapper.toStaffProfileResponse(staffProfile);
        if (staffProfile.getBranchId() != null) {
            try {
                BranchResponse branch = branchClient.getBranchById(staffProfile.getBranchId()).getResult();
                response.setBranch(branch);
            } catch (Exception e) {
                log.warn("Failed to fetch branch for staff {}: {}", staffProfile.getUserId(), e.getMessage());
            }
        }
        return response;
    }

    @PreAuthorize("hasRole('MANAGER')")
    public StaffProfileResponse updateStaffProfile(Integer userId, StaffProfileUpdateRequest request){
        StaffProfile staffProfile = staffProfileRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_ID_NOT_FOUND));
        if(request.getIdentityCard() != null){
            staffProfile.setIdentityCard(request.getIdentityCard());
        }
        if(request.getHireDate() != null){
            staffProfile.setHireDate(request.getHireDate());
        }
        // Map trường salary từ request sang baseSalary trong StaffProfile (giữ backward-compat với DTO cũ)
        if(request.getSalary() != null){
            staffProfile.setBaseSalary(request.getSalary());
        }
        staffProfile.setUpdateAt(LocalDateTime.now());
        staffProfileRepository.save(staffProfile);
        StaffProfileResponse response = staffProfileMapper.toStaffProfileResponse(staffProfile);
        if (staffProfile.getBranchId() != null) {
            try {
                BranchResponse branch = branchClient.getBranchById(staffProfile.getBranchId()).getResult();
                response.setBranch(branch);
            } catch (Exception e) {
                log.warn("Failed to fetch branch for staff {}: {}", staffProfile.getUserId(), e.getMessage());
            }
        }
        return response;
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public List<StaffProfileResponse> getAllStaffProfiles(){
        List<StaffProfile> staffProfiles = staffProfileRepository.findAll();
        return staffProfiles.stream()
                .map(staffProfile -> {
                    StaffProfileResponse response = staffProfileMapper.toStaffProfileResponse(staffProfile);
                    if (staffProfile.getBranchId() != null) {
                        try {
                            BranchResponse branch = branchClient.getBranchById(staffProfile.getBranchId()).getResult();
                            response.setBranch(branch);
                        } catch (Exception e) {
                            log.warn("Failed to fetch branch for staff {}: {}", staffProfile.getUserId(), e.getMessage());
                        }
                    }
                    return response;
                })
                .toList();
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    public StaffProfileResponse getStaffProfile(Integer userId){
        StaffProfile staffProfile = staffProfileRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_ID_NOT_FOUND));
        if(staffProfile.getBranchId() == null){
            throw new AppException(ErrorCode.USER_NOT_ASSIGNED_TO_BRANCH);
        }
        try {
            BranchResponse branch = branchClient.getBranchById(staffProfile.getBranchId()).getResult();
            StaffProfileResponse staffProfileResponse = staffProfileMapper.toStaffProfileResponse(staffProfile);
            staffProfileResponse.setBranch(branch);
            
            // Load staff role assignments
            List<StaffRoleAssignment> assignments = staffRoleAssignmentRepository.findByStaffProfile(staffProfile);
            List<Integer> roleIds = assignments.stream()
                    .map(StaffRoleAssignment::getRoleId)
                    .collect(Collectors.toList());
            String proficiencyLevel = assignments.stream()
                    .findFirst()
                    .map(StaffRoleAssignment::getProficiencyLevel)
                    .orElse(null);
            
            staffProfileResponse.setStaffBusinessRoleIds(roleIds);
            staffProfileResponse.setProficiencyLevel(proficiencyLevel);
            
            return staffProfileResponse;
        } catch (Exception e) {
            throw new AppException(ErrorCode.BRANCH_NOT_FOUND);
        }
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    public List<StaffProfileResponse> getStaffProfilesByBranch(Integer branchId){
        return getStaffProfilesByBranchInternal(branchId);
    }

    /**
     * Internal method without @PreAuthorize for internal services
     */
    public List<StaffProfileResponse> getStaffProfilesByBranchInternal(Integer branchId){
        List<StaffProfile> staffProfiles = staffProfileRepository.findByBranchId(branchId);
        return staffProfiles.stream()
                .map(staffProfile -> {
                    StaffProfileResponse response = staffProfileMapper.toStaffProfileResponse(staffProfile);
                    try {
                        BranchResponse branch = branchClient.getBranchById(branchId).getResult();
                        response.setBranch(branch);
                    } catch (Exception e) {
                        log.warn("Failed to fetch branch for staff {}: {}", staffProfile.getUserId(), e.getMessage());
                    }
                    return response;
                })
                .toList();
    }

    @PreAuthorize("hasRole('MANAGER')")
    @Transactional
    public void deleteStaffProfile(Integer userId){
        StaffProfile staffProfile = staffProfileRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_ID_NOT_FOUND));
        // Xoá tất cả staff_role_assignments trước (dùng userId để chắc chắn)
        staffRoleAssignmentRepository.deleteByStaffUserId(userId);
        // Sau đó xoá staff_profile
        staffProfileRepository.delete(staffProfile);
    }

    @PreAuthorize("hasRole('MANAGER')")
    @Transactional
    public void updateStaffProfileFull(Integer userId, StaffProfileFullUpdateRequest request) {
        StaffProfile staffProfile = staffProfileRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_ID_NOT_FOUND));

        if (request.getIdentityCard() != null) {
            staffProfile.setIdentityCard(request.getIdentityCard());
        }
        if (request.getHireDate() != null) {
            staffProfile.setHireDate(request.getHireDate());
        }
        if (request.getEmploymentType() != null) {
            staffProfile.setEmploymentType(request.getEmploymentType());
        }
        if (request.getPayType() != null) {
            staffProfile.setPayType(request.getPayType());
        }

        // Pay rules: MONTHLY requires baseSalary, HOURLY requires hourlyRate
        String effectivePayType = request.getPayType() != null
                ? request.getPayType()
                : staffProfile.getPayType();

        if ("MONTHLY".equalsIgnoreCase(effectivePayType)) {
            if (request.getBaseSalary() == null) {
                throw new AppException(ErrorCode.EMPTY_BASE_SALARY);
            }
            staffProfile.setBaseSalary(request.getBaseSalary());
            staffProfile.setHourlyRate(java.math.BigDecimal.ZERO);
        } else if ("HOURLY".equalsIgnoreCase(effectivePayType)) {
            if (request.getHourlyRate() == null) {
                throw new AppException(ErrorCode.EMPTY_HOURLY_RATE);
            }
            staffProfile.setHourlyRate(request.getHourlyRate());
            staffProfile.setBaseSalary(java.math.BigDecimal.ZERO);
        }

        if (request.getOvertimeRate() != null) {
            staffProfile.setOvertimeRate(request.getOvertimeRate());
        }

        staffProfile.setUpdateAt(LocalDateTime.now());
        staffProfileRepository.save(staffProfile);

        // Update staff_role_assignments
        if (request.getStaffBusinessRoleIds() != null) {
            // Defensive: request payload may contain duplicate roleIds (e.g. [5,5]),
            // which would violate UNIQUE KEY ux_staff_role (staff_user_id, role_id).
            List<Integer> distinctRoleIds = request.getStaffBusinessRoleIds().stream()
                    .filter(Objects::nonNull)
                    .distinct()
                    .toList();

            // Delete by userId for robustness
            staffRoleAssignmentRepository.deleteByStaffUserId(userId);

            if (!distinctRoleIds.isEmpty()) {
                String level = request.getProficiencyLevel() != null
                        ? request.getProficiencyLevel()
                        : "INTERMEDIATE";
                distinctRoleIds.forEach(roleId -> {
                    StaffRoleAssignment assignment = StaffRoleAssignment.builder()
                            .staffProfile(staffProfile)
                            .roleId(roleId)
                            .proficiencyLevel(level)
                            .certifiedAt(staffProfile.getHireDate())
                            .build();
                    staffRoleAssignmentRepository.save(assignment);
                });
            }
        }
    }

    /**
     * Lấy danh sách nhân viên ở chi nhánh kèm thông tin đầy đủ từ auth-service
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    public List<StaffWithUserResponse> getStaffsWithUserInfoByBranch(Integer branchId) {
        // 1. Lấy danh sách StaffProfile từ profile-service
        List<StaffProfile> staffProfiles = staffProfileRepository.findByBranchId(branchId);
        
        // 2. Lấy danh sách User từ auth-service
        List<UserResponse> users;
        try {
            users = authClient.getStaffsByBranch(branchId).getResult();
        } catch (Exception e) {
            log.error("Error fetching users from auth-service for branch {}: {}", branchId, e.getMessage(), e);
            users = List.of(); // Trả về danh sách rỗng nếu có lỗi
        }
        
        // 3. Tạo Map để lookup nhanh User theo userId
        Map<Integer, UserResponse> userMap = users != null ? 
            users.stream().collect(Collectors.toMap(
                user -> user.getUser_id() != null ? user.getUser_id() : 0,
                user -> user,
                (existing, replacement) -> existing
            )) : Map.of();
        
        // 4. Lấy thông tin branch
        BranchResponse branch = null;
        try {
            branch = branchClient.getBranchById(branchId).getResult();
        } catch (Exception e) {
            log.warn("Failed to fetch branch {}: {}", branchId, e.getMessage());
        }
        
        // 5. Merge thông tin từ StaffProfile, StaffRoleAssignment và User
        final BranchResponse finalBranch = branch;
        return staffProfiles.stream()
            .map(staffProfile -> {
                UserResponse user = userMap.get(staffProfile.getUserId());

                // Lấy danh sách role assignment cho staff này
                List<StaffRoleAssignment> assignments =
                        staffRoleAssignmentRepository.findByStaffProfile(staffProfile);
                List<Integer> roleIds = assignments.stream()
                        .map(StaffRoleAssignment::getRoleId)
                        .collect(Collectors.toList());
                String proficiencyLevel = assignments.stream()
                        .findFirst()
                        .map(StaffRoleAssignment::getProficiencyLevel)
                        .orElse(null);

                StaffWithUserResponse.StaffWithUserResponseBuilder builder = StaffWithUserResponse.builder()
                    .userId(staffProfile.getUserId())
                    .branch(finalBranch)
                    .identityCard(staffProfile.getIdentityCard())
                    .hireDate(staffProfile.getHireDate())
                    .employmentType(staffProfile.getEmploymentType())
                    .payType(staffProfile.getPayType())
                    .baseSalary(staffProfile.getBaseSalary())
                    .hourlyRate(staffProfile.getHourlyRate())
                    .overtimeRate(staffProfile.getOvertimeRate())
                    .createAt(staffProfile.getCreateAt())
                    .updateAt(staffProfile.getUpdateAt())
                    .staffBusinessRoleIds(roleIds)
                    .proficiencyLevel(proficiencyLevel);
                
                // Thêm thông tin từ User nếu có
                if (user != null) {
                    builder.email(user.getEmail())
                        .fullname(user.getFullname())
                        .phoneNumber(user.getPhoneNumber())
                        .dob(user.getDob())
                        .avatarUrl(user.getAvatarUrl())
                        .bio(user.getBio());
                    
                    // Lấy tên role
                    if (user.getRole() != null) {
                        builder.roleName(user.getRole().getName());
                    }
                }
                
                return builder.build();
            })
            .collect(Collectors.toList());
    }
}
