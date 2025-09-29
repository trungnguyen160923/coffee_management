package com.service.profile.service;

import com.service.profile.dto.response.AdminProfileResponse;
import com.service.profile.entity.AdminProfile;
import com.service.profile.exception.AppException;
import com.service.profile.exception.ErrorCode;
import com.service.profile.mapper.AdminProfileMapper;
import com.service.profile.repository.AdminProfileRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AdminProfileService {
    AdminProfileRepository adminProfileRepository;
    AdminProfileMapper adminProfileMapper;

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public AdminProfileResponse getAdminProfile(Integer userId){
        AdminProfile adminProfile = adminProfileRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_ID_NOT_FOUND));
        return adminProfileMapper.toAdminProfileResponse(adminProfile);
    }
}
