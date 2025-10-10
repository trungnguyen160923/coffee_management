package com.service.profile.service;

import com.service.profile.dto.request.StaffProfileCreationRequest;
import com.service.profile.dto.request.StaffProfileUpdateRequest;
import com.service.profile.dto.response.BranchResponse;
import com.service.profile.dto.response.StaffProfileResponse;
import com.service.profile.entity.StaffProfile;
import com.service.profile.exception.AppException;
import com.service.profile.exception.ErrorCode;
import com.service.profile.mapper.StaffProfileMapper;
import com.service.profile.repository.StaffProfileRepository;
import com.service.profile.repository.http_client.BranchClient;

import java.util.List;

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

    @PreAuthorize("hasRole('STAFF')")
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
}
