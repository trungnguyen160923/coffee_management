package com.service.profile.service;

import com.service.profile.dto.request.StaffProfileCreationRequest;
import com.service.profile.dto.response.StaffProfileResponse;
import com.service.profile.entity.StaffProfile;
import com.service.profile.mapper.StaffProfileMapper;
import com.service.profile.repository.StaffProfileRepository;

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

    @Transactional
    @PreAuthorize("hasRole('MANAGER')")
    public StaffProfileResponse createStaffProfile(StaffProfileCreationRequest request){
        StaffProfile staffProfile = staffProfileMapper.toStaffProfile(request);
        staffProfile.setCreateAt(LocalDateTime.now());
        staffProfile.setUpdateAt(LocalDateTime.now());
        staffProfileRepository.save(staffProfile);
        return staffProfileMapper.toStaffProfileResponse(staffProfile);
    }

}
