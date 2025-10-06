package com.service.catalog.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import com.service.catalog.dto.request.unit.UnitCreationRequest;
import com.service.catalog.dto.request.unit.UnitUpdateRequest;
import com.service.catalog.dto.response.UnitResponse;
import com.service.catalog.entity.Unit;
import com.service.catalog.exception.AppException;
import com.service.catalog.exception.ErrorCode;
import com.service.catalog.mapper.UnitMapper;
import com.service.catalog.repository.UnitRepository;

import jakarta.transaction.Transactional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UnitService {
    UnitRepository unitRepository;
    UnitMapper unitMapper;

    public List<UnitResponse> getAllUnits() {
        return unitRepository.findAll()
                .stream()
                .map(unitMapper::toUnitResponse)
                .toList();
    }


    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public UnitResponse createUnit(UnitCreationRequest request) {
        // Check if unit already exists
        if (unitRepository.existsById(request.getCode())) {
            throw new AppException(ErrorCode.UNIT_ALREADY_EXISTS);
        }
        
        // Validate base unit exists (only if it's different from current unit)
        Unit baseUnit = null;
        if (!request.getBaseUnitCode().equals(request.getCode())) {
            // Base unit code is different from current unit code
            baseUnit = unitRepository.findById(request.getBaseUnitCode())
                    .orElseThrow(() -> new AppException(ErrorCode.BASE_UNIT_CODE_NOT_FOUND));
        }
        
        // Create unit manually to avoid Hibernate issues
        Unit unit = Unit.builder()
                .code(request.getCode())
                .name(request.getName())
                .dimension(request.getDimension())
                .factorToBase(request.getFactorToBase())
                .createAt(LocalDateTime.now())
                .updateAt(LocalDateTime.now())
                .build();
        
        // Set baseUnit after creation to avoid Hibernate issues
        if (baseUnit != null) {
            // For derived unit, set baseUnit to existing unit
            unit.setBaseUnit(baseUnit);
        } else {
            // For base unit, set baseUnit to itself (self-reference)
            unit.setBaseUnit(unit);
        }
        
        Unit savedUnit = unitRepository.save(unit);
        return unitMapper.toUnitResponse(savedUnit);
    }


    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public UnitResponse updateUnit(String unitCode, UnitUpdateRequest request) {
        Unit unit = unitRepository.findById(unitCode)
                .orElseThrow(() -> new AppException(ErrorCode.UNIT_NOT_FOUND));

        // Update basic fields
        if(request.getName() != null) {
            unit.setName(request.getName());
        }
        // Note: Code (primary key) cannot be changed after creation
        if(request.getDimension() != null) {
            unit.setDimension(request.getDimension());
        }
        if(request.getFactorToBase() != null) {
            unit.setFactorToBase(request.getFactorToBase());
        }
        
        // Handle baseUnit update
        if(request.getBaseUnitCode() != null) {
            if(request.getBaseUnitCode().equals(unitCode)) {
                // Self-reference: set baseUnit to itself
                unit.setBaseUnit(unit);
            } else {
                // Find existing base unit
                Unit baseUnit = unitRepository.findById(request.getBaseUnitCode())
                        .orElseThrow(() -> new AppException(ErrorCode.BASE_UNIT_CODE_NOT_FOUND));
                unit.setBaseUnit(baseUnit);
            }
        }
        
        unit.setUpdateAt(LocalDateTime.now());
        unitRepository.save(unit);
        return unitMapper.toUnitResponse(unit);
    }


    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteUnit(String unitCode) {
        Unit unit = unitRepository.findById(unitCode)
                .orElseThrow(() -> new AppException(ErrorCode.UNIT_NOT_FOUND));
        
        // Check if unit is being used as base unit by OTHER units (not self-reference)
        boolean isUsedAsBaseUnit = unitRepository.existsByBaseUnitCode(unitCode);
        if (isUsedAsBaseUnit) {
            // Check if it's only self-reference (baseUnitCode = code)
            if (unit.getBaseUnit() != null && unit.getBaseUnit().getCode().equals(unitCode)) {
                // It's self-reference, check if there are other units using this as base
                List<Unit> dependentUnits = unitRepository.findByBaseUnitCode(unitCode);
                // Filter out self-reference
                long otherDependentCount = dependentUnits.stream()
                    .filter(dep -> !dep.getCode().equals(unitCode))
                    .count();
                
                if (otherDependentCount > 0) {
                    // There are other units using this as base unit, not allowed to delete
                    throw new AppException(ErrorCode.UNIT_IN_USE_AS_BASE);
                }
                // Only self-reference, allow deletion
            } else {
                // It's being used by other units, not allowed to delete
                throw new AppException(ErrorCode.UNIT_IN_USE_AS_BASE);
            }
        }
        
        // Use native SQL delete to bypass Hibernate constraint issues
        unitRepository.deleteByCodeNative(unitCode);
    }
    
}
