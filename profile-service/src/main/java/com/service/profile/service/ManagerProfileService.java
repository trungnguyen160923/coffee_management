package com.service.profile.service;

import com.service.profile.dto.ApiResponse;
import com.service.profile.dto.request.AssignManagerRequest;
import com.service.profile.dto.request.AssignManagerRequest_;
import com.service.profile.dto.request.ManagerProfileCreationRequest;
import com.service.profile.dto.request.ManagerProfileUpdateRequest;
import com.service.profile.dto.response.BranchResponse;
import com.service.profile.dto.response.ManagerProfileResponse;
import com.service.profile.entity.ManagerProfile;
import com.service.profile.exception.AppException;
import com.service.profile.exception.ErrorCode;
import com.service.profile.mapper.ManagerProfileMapper;
import com.service.profile.repository.ManagerProfileRepository;

import com.service.profile.repository.http_client.BranchClient;
import jakarta.transaction.Transactional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ManagerProfileService {
    ManagerProfileRepository managerProfileRepository;
    ManagerProfileMapper managerProfileMapper;
    BranchClient branchClient;

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public ManagerProfileResponse createManagerProfile(ManagerProfileCreationRequest request){
        if (managerProfileRepository.existsByIdentityCard(request.getIdentityCard())) {
            throw new AppException(ErrorCode.IDENTITY_CARD_EXISTED);
        }
        ManagerProfile managerProfile = managerProfileMapper.toManagerProfile(request);
        managerProfile.setCreateAt(LocalDateTime.now());
        managerProfile.setUpdateAt(LocalDateTime.now());
        managerProfileRepository.save(managerProfile);
        return managerProfileMapper.toManagerProfileResponse(managerProfile);
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ManagerProfileResponse getManagerProfile(Integer userId){
        ManagerProfile managerProfile = managerProfileRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_ID_NOT_FOUND));
        try {
            ManagerProfileResponse managerProfileResponse = managerProfileMapper.toManagerProfileResponse(managerProfile);
            if(managerProfile.getBranchId() != -1){
                BranchResponse branch = branchClient.getBranchById(managerProfile.getBranchId()).getResult();
                managerProfileResponse.setBranch(branch);
            }
            return managerProfileResponse;
        } catch (Exception e) {
            log.error("Error fetching manager profile: {}", e.getMessage());
            throw new AppException(ErrorCode.BRANCH_NOT_FOUND);
        }
    }

    @PreAuthorize("hasRole('ADMIN')")
    public List<ManagerProfileResponse> getAllManagerProfiles(){
        List<ManagerProfile> managerProfiles = managerProfileRepository.findAll(); 
        try {
            List<BranchResponse> branches = branchClient.getBranches().getResult();
            List<ManagerProfileResponse> managerProfileResponses = managerProfiles.stream().map(managerProfileMapper::toManagerProfileResponse).toList();
            for(ManagerProfileResponse managerProfileResponse : managerProfileResponses){
                BranchResponse branch = branches.stream()
                    .filter(b -> b.getManagerUserId() != null && b.getManagerUserId().equals(managerProfileResponse.getUserId()))
                    .findFirst().orElse(null);
                if(branch != null){
                    managerProfileResponse.setBranch(branch);
                }
            }
        return managerProfileResponses;
        } catch (Exception e) {
            log.error("[ManagerProfileService] Error in getAllManagerProfiles() - exception type: {}, message: {}", 
                e.getClass().getSimpleName(), e.getMessage(), e);
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
        
    }

    @PreAuthorize("hasRole('ADMIN')")
    public ManagerProfileResponse updateManagerProfile(Integer userId, ManagerProfileUpdateRequest request){
        ManagerProfile managerProfile = managerProfileRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_ID_NOT_FOUND));
        if (managerProfileRepository.existsByIdentityCard(request.getIdentityCard()) && !managerProfile.getIdentityCard().equals(request.getIdentityCard())) {
            throw new AppException(ErrorCode.IDENTITY_CARD_EXISTED);
        }
        if(request.getIdentityCard() != null){
            managerProfile.setIdentityCard(request.getIdentityCard());
        }
        if(request.getHireDate() != null){
            managerProfile.setHireDate(request.getHireDate());
        }
        managerProfile.setUpdateAt(LocalDateTime.now());
        managerProfileRepository.save(managerProfile);
        return managerProfileMapper.toManagerProfileResponse(managerProfile);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public void unassignManager(Integer userId){
        ManagerProfile managerProfile = managerProfileRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_ID_NOT_FOUND));
        if(managerProfile.getBranchId() == -1){
            throw new AppException(ErrorCode.USER_NOT_ASSIGNED_TO_BRANCH);
        }
        try {
            AssignManagerRequest request = new AssignManagerRequest();
            request.setManagerUserId(userId);
            BranchResponse branch = branchClient.unassignManager(managerProfile.getBranchId(), request).getResult();    
            managerProfile.setBranchId(-1);
            managerProfileRepository.save(managerProfile);
        } catch (Exception e) {
            throw new AppException(ErrorCode.BRANCH_NOT_FOUND);
        }
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public void assignManager(AssignManagerRequest_ request){
        ManagerProfile managerProfile = managerProfileRepository.findById(request.getManagerUserId()).orElseThrow(() -> new AppException(ErrorCode.USER_ID_NOT_FOUND));
        managerProfile.setBranchId(request.getBranchId());
        managerProfileRepository.save(managerProfile);
        try {
            AssignManagerRequest request_ = new AssignManagerRequest();
            request_.setManagerUserId(request.getManagerUserId());
            BranchResponse branch = branchClient.assignManager(managerProfile.getBranchId(), request_).getResult();
            managerProfile.setBranchId(managerProfile.getBranchId());
            managerProfileRepository.save(managerProfile);
        } catch (Exception e) {
            throw new AppException(ErrorCode.BRANCH_NOT_FOUND);
        }
    }
}
