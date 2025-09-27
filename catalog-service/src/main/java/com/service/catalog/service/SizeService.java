package com.service.catalog.service;

import com.service.catalog.dto.request.SizeCreationRequest;
import com.service.catalog.dto.response.SizeResponse;
import com.service.catalog.entity.Size;
import com.service.catalog.mapper.SizeMapper;
import com.service.catalog.repository.SizeRepository;

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
public class SizeService {
    SizeRepository sizeRepository;
    SizeMapper sizeMapper;

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public SizeResponse createSize(SizeCreationRequest request) {
        Size size = sizeMapper.toSize(request);
        size.setCreateAt(LocalDateTime.now());
        size.setUpdateAt(LocalDateTime.now());
        sizeRepository.save(size);
        return sizeMapper.toSizeResponse(size);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public List<SizeResponse> getAllSizes() {
        return sizeRepository.findAll()
                .stream()
                .map(sizeMapper::toSizeResponse)
                .toList();
    }
}
