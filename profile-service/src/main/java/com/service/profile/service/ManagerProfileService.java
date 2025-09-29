package com.service.profile.service;

import com.service.profile.dto.ApiResponse;
import com.service.profile.dto.request.ManagerProfileCreationRequest;
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
        ManagerProfile managerProfile = managerProfileMapper.toManagerProfile(request);
        managerProfile.setCreateAt(LocalDateTime.now());
        managerProfile.setUpdateAt(LocalDateTime.now());
        managerProfileRepository.save(managerProfile);
        return managerProfileMapper.toManagerProfileResponse(managerProfile);
    }

    @PreAuthorize("hasRole('MANAGER')")
    public ManagerProfileResponse getManagerProfile(Integer userId){
        ManagerProfile managerProfile = managerProfileRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_ID_NOT_FOUND));
        try {
            BranchResponse branch = branchClient.getBranchById(managerProfile.getBranchId()).getResult();
            ManagerProfileResponse managerProfileResponse = managerProfileMapper.toManagerProfileResponse(managerProfile);
            managerProfileResponse.setBranch(branch);
            return managerProfileResponse;
        } catch (Exception e) {
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
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
        
    }
}
