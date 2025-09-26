package com.service.profile.service;

import com.service.profile.dto.request.ManagerProfileCreationRequest;
import com.service.profile.dto.response.ManagerProfileResponse;
import com.service.profile.entity.ManagerProfile;
import com.service.profile.mapper.ManagerProfileMapper;
import com.service.profile.repository.ManagerProfileRepository;

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
public class ManagerProfileService {
    ManagerProfileRepository managerProfileRepository;
    ManagerProfileMapper managerProfileMapper;

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public ManagerProfileResponse createManagerProfile(ManagerProfileCreationRequest request){
        ManagerProfile managerProfile = managerProfileMapper.toManagerProfile(request);
        managerProfile.setCreateAt(LocalDateTime.now());
        managerProfile.setUpdateAt(LocalDateTime.now());
        managerProfileRepository.save(managerProfile);
        return managerProfileMapper.toManagerProfileResponse(managerProfile);
    }
}
