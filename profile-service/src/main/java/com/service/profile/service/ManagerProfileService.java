package com.service.profile.service;

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

        // Nếu có branchId hợp lệ thì gán manager cho chi nhánh ngay lúc tạo
        if (managerProfile.getBranchId() != null && managerProfile.getBranchId() != -1) {
            try {
                AssignManagerRequest assignRequest = new AssignManagerRequest();
                assignRequest.setManagerUserId(managerProfile.getUserId());
                branchClient.assignManager(managerProfile.getBranchId(), assignRequest).getResult();
                log.info("Assigned manager {} to branch {} during createManagerProfile",
                        managerProfile.getUserId(), managerProfile.getBranchId());
            } catch (Exception e) {
                log.error("Failed to assign manager {} to branch {} during createManagerProfile: {}",
                        managerProfile.getUserId(), managerProfile.getBranchId(), e.getMessage());
                throw new AppException(ErrorCode.BRANCH_NOT_FOUND);
            }
        }

        return managerProfileMapper.toManagerProfileResponse(managerProfile);
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ManagerProfileResponse getManagerProfile(Integer userId){
        ManagerProfile managerProfile = managerProfileRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_ID_NOT_FOUND));
        ManagerProfileResponse managerProfileResponse = managerProfileMapper.toManagerProfileResponse(managerProfile);
        if(managerProfile.getBranchId() != null && managerProfile.getBranchId() != -1){
            try {
                BranchResponse branch = branchClient.getBranchById(managerProfile.getBranchId()).getResult();
                managerProfileResponse.setBranch(branch);
            } catch (Exception e) {
                log.warn("Failed to fetch branch {} for manager {}: {}", managerProfile.getBranchId(), userId, e.getMessage());
                // Continue without branch info instead of throwing exception
                // This allows the profile to be returned even if order-service is unavailable
            }
        }
        return managerProfileResponse;
    }

    @PreAuthorize("hasRole('ADMIN')")
    public List<ManagerProfileResponse> getAllManagerProfiles(){
        List<ManagerProfile> managerProfiles = managerProfileRepository.findAll(); 
        List<ManagerProfileResponse> managerProfileResponses = managerProfiles.stream().map(managerProfileMapper::toManagerProfileResponse).toList();
        
        try {
            List<BranchResponse> branches = branchClient.getBranches().getResult();
            for(ManagerProfileResponse managerProfileResponse : managerProfileResponses){
                BranchResponse branch = branches.stream()
                    .filter(b -> b.getManagerUserId() != null && b.getManagerUserId().equals(managerProfileResponse.getUserId()))
                    .findFirst().orElse(null);
                if(branch != null){
                    managerProfileResponse.setBranch(branch);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to fetch branches for manager profiles: {}", e.getMessage());
            // Continue without branch info - return profiles anyway
        }
        
        return managerProfileResponses;
    }

    @PreAuthorize("hasRole('ADMIN')")
    public ManagerProfileResponse updateManagerProfile(Integer userId, ManagerProfileUpdateRequest request){
        ManagerProfile managerProfile = managerProfileRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_ID_NOT_FOUND));
        if (request.getIdentityCard() != null) {
            if (managerProfileRepository.existsByIdentityCard(request.getIdentityCard()) && !managerProfile.getIdentityCard().equals(request.getIdentityCard())) {
                throw new AppException(ErrorCode.IDENTITY_CARD_EXISTED);
            }
            managerProfile.setIdentityCard(request.getIdentityCard());
        }
        if(request.getHireDate() != null){
            managerProfile.setHireDate(request.getHireDate());
        }
        if(request.getBaseSalary() != null){
            managerProfile.setBaseSalary(request.getBaseSalary());
            // Auto-update insurance salary when base salary changes (simple rule: equal)
            managerProfile.setInsuranceSalary(request.getBaseSalary());
        } else if (request.getInsuranceSalary() != null){
            // Allow explicit override if only insuranceSalary is sent
            managerProfile.setInsuranceSalary(request.getInsuranceSalary());
        }
        if(request.getNumberOfDependents() != null){
            managerProfile.setNumberOfDependents(request.getNumberOfDependents());
        }
        managerProfile.setUpdateAt(LocalDateTime.now());
        managerProfileRepository.save(managerProfile);
        return managerProfileMapper.toManagerProfileResponse(managerProfile);
    }

    @PreAuthorize("hasRole('ADMIN') or @managerProfileService.canUpdateOwnProfile(#userId, authentication)")
    public ManagerProfileResponse updateOwnManagerProfile(Integer userId, ManagerProfileUpdateRequest request){
        ManagerProfile managerProfile = managerProfileRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_ID_NOT_FOUND));
        
        // Manager can only update identityCard, not hireDate or baseSalary
        if (request.getIdentityCard() != null) {
            if (managerProfileRepository.existsByIdentityCard(request.getIdentityCard()) && !managerProfile.getIdentityCard().equals(request.getIdentityCard())) {
                throw new AppException(ErrorCode.IDENTITY_CARD_EXISTED);
            }
            managerProfile.setIdentityCard(request.getIdentityCard());
        }
        
        managerProfile.setUpdateAt(LocalDateTime.now());
        managerProfileRepository.save(managerProfile);
        return managerProfileMapper.toManagerProfileResponse(managerProfile);
    }

    public boolean canUpdateOwnProfile(Integer userId, org.springframework.security.core.Authentication authentication) {
        if (authentication == null) return false;
        
        // Get current user ID from JWT
        if (authentication.getPrincipal() instanceof org.springframework.security.oauth2.jwt.Jwt jwt) {
            Long currentUserIdLong = jwt.getClaim("user_id");
            if (currentUserIdLong != null) {
                Integer currentUserId = currentUserIdLong.intValue();
                return currentUserId.equals(userId);
            }
        }
        return false;
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
            branchClient.unassignManager(managerProfile.getBranchId(), request).getResult();    
            managerProfile.setBranchId(-1);
            managerProfileRepository.save(managerProfile);
        } catch (Exception e) {
            log.error("Failed to unassign manager from branch: {}", e.getMessage());
            throw new AppException(ErrorCode.BRANCH_NOT_FOUND);
        }
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public void assignManager(AssignManagerRequest_ request){
        ManagerProfile managerProfile = managerProfileRepository.findById(request.getManagerUserId()).orElseThrow(() -> new AppException(ErrorCode.USER_ID_NOT_FOUND));
        
        Integer oldBranchId = managerProfile.getBranchId();
        Integer newBranchId = request.getBranchId();
        
        // If manager already has a branch and it's different from the new one, unassign from old branch first
        if (oldBranchId != null && oldBranchId != -1 && !oldBranchId.equals(newBranchId)) {
            try {
                AssignManagerRequest unassignRequest = new AssignManagerRequest();
                unassignRequest.setManagerUserId(request.getManagerUserId());
                branchClient.unassignManager(oldBranchId, unassignRequest).getResult();
                log.info("Unassigned manager {} from old branch {}", request.getManagerUserId(), oldBranchId);
            } catch (Exception e) {
                log.warn("Failed to unassign manager {} from old branch {}: {}", request.getManagerUserId(), oldBranchId, e.getMessage());
                // Continue anyway - might be already unassigned or branch doesn't exist
            }
        }
        
        // Assign manager to new branch
        try {
            AssignManagerRequest assignRequest = new AssignManagerRequest();
            assignRequest.setManagerUserId(request.getManagerUserId());
            branchClient.assignManager(newBranchId, assignRequest).getResult();
            
            // Update branchId in manager_profiles table
            managerProfile.setBranchId(newBranchId);
            managerProfileRepository.save(managerProfile);
            log.info("Assigned manager {} to branch {}", request.getManagerUserId(), newBranchId);
        } catch (Exception e) {
            log.error("Failed to assign manager {} to branch {}: {}", request.getManagerUserId(), newBranchId, e.getMessage());
            throw new AppException(ErrorCode.BRANCH_NOT_FOUND);
        }
    }
}
