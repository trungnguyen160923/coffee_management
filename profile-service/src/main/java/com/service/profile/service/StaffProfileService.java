package com.service.profile.service;

import com.service.profile.dto.request.StaffProfileCreationRequest;
import com.service.profile.dto.request.StaffProfileUpdateRequest;
import com.service.profile.dto.response.BranchResponse;
import com.service.profile.dto.response.StaffProfileResponse;
import com.service.profile.dto.response.StaffWithUserResponse;
import com.service.profile.dto.response.UserResponse;
import com.service.profile.entity.StaffProfile;
import com.service.profile.exception.AppException;
import com.service.profile.exception.ErrorCode;
import com.service.profile.mapper.StaffProfileMapper;
import com.service.profile.repository.StaffProfileRepository;
import com.service.profile.repository.http_client.AuthClient;
import com.service.profile.repository.http_client.BranchClient;

import java.util.List;
import java.util.Map;
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
        if(request.getPosition() != null){
            staffProfile.setPosition(request.getPosition());
        }
        if(request.getHireDate() != null){
            staffProfile.setHireDate(request.getHireDate());
        }
        if(request.getSalary() != null){
            staffProfile.setSalary(request.getSalary());
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
            return staffProfileResponse;
        } catch (Exception e) {
            throw new AppException(ErrorCode.BRANCH_NOT_FOUND);
        }
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
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
    public void deleteStaffProfile(Integer userId){
        staffProfileRepository.deleteById(userId);
    }

    /**
     * Lấy danh sách nhân viên ở chi nhánh kèm thông tin đầy đủ từ auth-service
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public List<StaffWithUserResponse> getStaffsWithUserInfoByBranch(Integer branchId) {
        log.info("Getting staffs with user info for branch: {}", branchId);
        
        // 1. Lấy danh sách StaffProfile từ profile-service
        List<StaffProfile> staffProfiles = staffProfileRepository.findByBranchId(branchId);
        log.debug("Found {} staff profiles for branch {}", staffProfiles.size(), branchId);
        
        // 2. Lấy danh sách User từ auth-service
        List<UserResponse> users;
        try {
            users = authClient.getStaffsByBranch(branchId).getResult();
            log.debug("Found {} users from auth-service for branch {}", users != null ? users.size() : 0, branchId);
        } catch (Exception e) {
            log.error("Error fetching users from auth-service for branch {}: {}", branchId, e.getMessage());
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
        
        // 5. Merge thông tin từ StaffProfile và User
        final BranchResponse finalBranch = branch;
        return staffProfiles.stream()
            .map(staffProfile -> {
                UserResponse user = userMap.get(staffProfile.getUserId());
                
                StaffWithUserResponse.StaffWithUserResponseBuilder builder = StaffWithUserResponse.builder()
                    .userId(staffProfile.getUserId())
                    .branch(finalBranch)
                    .identityCard(staffProfile.getIdentityCard())
                    .position(staffProfile.getPosition())
                    .hireDate(staffProfile.getHireDate())
                    .salary(staffProfile.getSalary())
                    .createAt(staffProfile.getCreateAt())
                    .updateAt(staffProfile.getUpdateAt());
                
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
