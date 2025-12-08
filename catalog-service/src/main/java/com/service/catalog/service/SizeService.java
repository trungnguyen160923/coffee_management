package com.service.catalog.service;

import com.service.catalog.dto.request.size.SizeCreationRequest;
import com.service.catalog.dto.request.size.SizeUpdateRequest;
import com.service.catalog.dto.response.SizeResponse;
import com.service.catalog.entity.Size;
import com.service.catalog.exception.AppException;
import com.service.catalog.exception.ErrorCode;
import com.service.catalog.mapper.SizeMapper;
import com.service.catalog.repository.SizeRepository;
import com.service.catalog.repository.ProductDetailRepository;

import jakarta.transaction.Transactional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SizeService {
    SizeRepository sizeRepository;
    ProductDetailRepository productDetailRepository;
    SizeMapper sizeMapper;

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public SizeResponse createSize(SizeCreationRequest request) {
        try {
            Size size = sizeMapper.toSize(request);
            size.setCreateAt(LocalDateTime.now());
            size.setUpdateAt(LocalDateTime.now());
            sizeRepository.save(size);
            return toSizeResponse(size);
        } catch (Exception e) {
            if(e instanceof DataIntegrityViolationException) {
                throw new AppException(ErrorCode.SIZE_NAME_ALREADY_EXISTS, "Size with name '" + request.getName() + "' already exists");
            }
            log.error("Error creating size: {}", request.getName(), e);
            throw new AppException(ErrorCode.SERVER_ERROR, "Error creating size: " + e.getMessage());
        }
    }

    @Transactional
    public List<SizeResponse> getAllSizes() {
        return sizeRepository.findAll()
                .stream()
                .map(this::toSizeResponse)
                .toList();
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public SizeResponse updateSize(Integer sizeId, SizeUpdateRequest request) {
        Size size = sizeRepository.findById(sizeId)
                .orElseThrow(() -> new AppException(ErrorCode.SIZE_NOT_FOUND));
        
        // Kiểm tra tên size mới có trùng với size khác không (trừ size hiện tại)
        if (!size.getName().equals(request.getName())) {
            boolean nameExists = sizeRepository.existsByNameAndSizeIdNot(request.getName(), sizeId);
            if (nameExists) {
                throw new AppException(ErrorCode.SIZE_NAME_ALREADY_EXISTS, "Size with name '" + request.getName() + "' already exists");
            }
        }
        
        size.setName(request.getName());
        size.setDescription(request.getDescription());
        size.setUpdateAt(LocalDateTime.now());
        sizeRepository.save(size);
        return toSizeResponse(size);
    }

    /**
     * Helper method to convert Size entity to SizeResponse with default active = true
     */
    private SizeResponse toSizeResponse(Size size) {
        if (size == null) {
            return null;
        }
        SizeResponse response = sizeMapper.toSizeResponse(size);
        if (response != null && response.getActive() == null) {
            response.setActive(true); // Default to true if entity doesn't have active field
        }
        return response;
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteSize(Integer sizeId) {
        Size size = sizeRepository.findById(sizeId)
                .orElseThrow(() -> new AppException(ErrorCode.SIZE_NOT_FOUND));
        
        // Kiểm tra xem size có được sử dụng trong ProductDetail không
        boolean isSizeInUse = productDetailRepository.existsBySizeSizeId(sizeId);
        if (isSizeInUse) {
            throw new AppException(ErrorCode.SIZE_IN_USE, "Cannot delete size. This size is currently being used in products.");
        }
        
        sizeRepository.deleteById(sizeId);
    }
}
