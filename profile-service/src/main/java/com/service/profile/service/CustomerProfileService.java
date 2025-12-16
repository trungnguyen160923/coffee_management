package com.service.profile.service;

import com.service.profile.dto.request.CustomerProfileCreationRequest;
import com.service.profile.dto.request.CustomerProfileUpdateRequest;
import com.service.profile.dto.response.CustomerProfileResponse;
import com.service.profile.entity.CustomerProfile;
import com.service.profile.exception.AppException;
import com.service.profile.exception.ErrorCode;
import com.service.profile.mapper.CustomerProfileMapper;
import com.service.profile.repository.CustomerProfileRepository;

import jakarta.transaction.Transactional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CustomerProfileService {
    CustomerProfileRepository customerProfileRepository;
    CustomerProfileMapper customerProfileMapper;

    @Transactional
    public CustomerProfileResponse createCustomerProfile(CustomerProfileCreationRequest request){
        try {
            if (customerProfileRepository.existsByUserId(request.getUserId())) {
                throw new AppException(ErrorCode.USER_ID_EXISTED);
            }
            
            CustomerProfile customerProfile = customerProfileMapper.toCustomerProfile(request);
            customerProfile.setUserId(request.getUserId()); // Set user ID manually
            
            // Set timestamps manually
            LocalDateTime now = LocalDateTime.now();
            customerProfile.setCreateAt(now);
            customerProfile.setUpdateAt(now);
            
            customerProfileRepository.save(customerProfile);
                      
            return customerProfileMapper.toCustomerProfileResponse(customerProfile);
            
        } catch (Exception e) {
            throw e;
        }
    }

    public CustomerProfileResponse getCustomerProfile(Integer userId){
        CustomerProfile customerProfile = customerProfileRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.EMAIL_NOT_EXISTED));
        return customerProfileMapper.toCustomerProfileResponse(customerProfile);
    }

    @PreAuthorize("hasRole('CUSTOMER')")
    public CustomerProfileResponse getCurrentCustomerProfile(){
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }
        
        // Get user ID from JWT token claims
        Integer userId = getUserIdFromToken(auth);
        log.info("Getting profile for user ID: {}", userId);
        
        // Find customer profile by user ID
        CustomerProfile customerProfile = customerProfileRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.EMAIL_NOT_EXISTED));
        
        return customerProfileMapper.toCustomerProfileResponse(customerProfile);
    }
    
    private Integer getUserIdFromToken(Authentication auth) {
        if (auth.getPrincipal() instanceof Jwt jwt) {
            // Debug: Log all claims
            log.info("JWT Claims: {}", jwt.getClaims());
            log.info("JWT Subject: {}", jwt.getSubject());
            
            // Extract user_id from JWT claims
            Object userIdClaim = jwt.getClaim("user_id");
            log.info("user_id claim: {} (type: {})", userIdClaim, userIdClaim != null ? userIdClaim.getClass().getSimpleName() : "null");
            
            if (userIdClaim instanceof Integer userId) {
                log.info("Extracted user_id as Integer: {}", userId);
                return userId;
            } else if (userIdClaim instanceof Long userIdLong) {
                Integer userId = userIdLong.intValue();
                log.info("Extracted user_id as Long and converted to Integer: {}", userId);
                return userId;
            } else if (userIdClaim instanceof String userIdStr) {
                try {
                    Integer userId = Integer.parseInt(userIdStr);
                    log.info("Extracted user_id as String and converted to Integer: {}", userId);
                    return userId;
                } catch (NumberFormatException e) {
                    log.error("Invalid user_id format in JWT token: {}", userIdStr);
                    throw new AppException(ErrorCode.ACCESS_DENIED);
                }
            } else {
                log.error("user_id claim is not Integer, Long, or String: {} (type: {})", userIdClaim, userIdClaim.getClass().getSimpleName());
            }
        } else {
            log.error("Authentication principal is not Jwt: {}", auth.getPrincipal().getClass().getSimpleName());
        }

        log.error("Could not extract user_id from JWT token");
        throw new AppException(ErrorCode.ACCESS_DENIED);
    }

    @PreAuthorize("hasRole('CUSTOMER')")
    @Transactional
    public CustomerProfileResponse updateOwnCustomerProfile(CustomerProfileUpdateRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }
        
        // Get user ID from JWT token claims
        Integer userId = getUserIdFromToken(auth);
        log.info("Updating profile for user ID: {}", userId);
        
        // Find customer profile by user ID
        CustomerProfile customerProfile = customerProfileRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.EMAIL_NOT_EXISTED));
        
        // Update fields if provided
        if (request.getDob() != null) {
            customerProfile.setDob(request.getDob());
        }
        if (request.getAvatarUrl() != null) {
            customerProfile.setAvatarUrl(request.getAvatarUrl());
        }
        if (request.getBio() != null) {
            customerProfile.setBio(request.getBio());
        }
        
        // Update timestamp
        customerProfile.setUpdateAt(LocalDateTime.now());
        
        customerProfileRepository.save(customerProfile);
        
        return customerProfileMapper.toCustomerProfileResponse(customerProfile);
    }
    
}
