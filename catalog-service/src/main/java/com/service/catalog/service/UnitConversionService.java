package com.service.catalog.service;

import com.service.catalog.dto.request.unitConversion.CreateIngredientUnitConversionRequest;
import com.service.catalog.dto.response.IngredientUnitConversionResponse;
import com.service.catalog.entity.IngredientUnitConversion;
import com.service.catalog.entity.Unit;
import com.service.catalog.repository.IngredientUnitConversionRepository;
import com.service.catalog.repository.UnitRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UnitConversionService {

    private final IngredientUnitConversionRepository conversionRepository;
    private final UnitRepository unitRepository;

    /**
     * Convert quantity from one unit to another for a specific ingredient
     * @param ingredientId The ingredient ID
     * @param fromUnit The source unit code
     * @param toUnit The target unit code
     * @param quantity The quantity to convert
     * @return Converted quantity
     * @throws IllegalArgumentException if conversion is not possible
     */
    public BigDecimal convertQuantity(Integer ingredientId, String fromUnit, String toUnit, BigDecimal quantity) {
        return convertQuantity(ingredientId, fromUnit, toUnit, quantity, null);
    }

    public BigDecimal convertQuantity(Integer ingredientId, String fromUnit, String toUnit, BigDecimal quantity, Integer branchId) {
        
        if (fromUnit.equals(toUnit)) {
            log.info("Same units, returning original quantity: {}", quantity);
            return quantity;
        }

        // Get unit information
        Optional<Unit> fromUnitInfo = unitRepository.findByCode(fromUnit);
        Optional<Unit> toUnitInfo = unitRepository.findByCode(toUnit);
        
        if (fromUnitInfo.isEmpty() || toUnitInfo.isEmpty()) {
            log.error("Unit not found: fromUnit={}, toUnit={}", fromUnit, toUnit);
            throw new IllegalArgumentException("Unit not found: " + fromUnit + " or " + toUnit);
        }

        Unit from = fromUnitInfo.get();
        Unit to = toUnitInfo.get();
        log.info("Units found: from={} (dimension: {}), to={} (dimension: {})", 
                from.getCode(), from.getDimension(), to.getCode(), to.getDimension());

        // Check if same dimension - use base unit conversion
        if (from.getDimension().equals(to.getDimension())) {
            log.info("Same dimension conversion: {} -> {}", from.getDimension(), to.getDimension());
            BigDecimal result = convertSameDimension(from, to, quantity);
            log.info("Same dimension result: {}", result);
            return result;
        }

        // Different dimensions - check ingredient-specific conversions
        log.info("Different dimensions, checking ingredient-specific conversions");
        BigDecimal result = convertDifferentDimensions(ingredientId, fromUnit, toUnit, quantity, branchId);
        log.info("Different dimensions result: {}", result);
        return result;
    }

    /**
     * Convert between units of the same dimension using base unit
     */
    private BigDecimal convertSameDimension(Unit from, Unit to, BigDecimal quantity) {
        // Both units should have the same base unit for same dimension conversion
        if (!from.getBaseUnit().getCode().equals(to.getBaseUnit().getCode())) {
            throw new IllegalArgumentException(
                String.format("Units %s and %s have different base units (%s vs %s)", 
                    from.getCode(), to.getCode(), 
                    from.getBaseUnit().getCode(), to.getBaseUnit().getCode())
            );
        }
        
        // Convert from unit to base unit, then from base unit to target unit
        // Formula: result = quantity * (from.factorToBase / to.factorToBase)
        BigDecimal conversionFactor = from.getFactorToBase().divide(to.getFactorToBase(), 8, RoundingMode.HALF_UP);
        log.info("Conversion factor: {}", conversionFactor);
        return quantity.multiply(conversionFactor).setScale(4, RoundingMode.HALF_UP);
    }


    /**
     * Convert between units of different dimensions using ingredient-specific conversions with branch filter
     * Priority order: BRANCH-specific → GLOBAL → throw exception
     */
    private BigDecimal convertDifferentDimensions(Integer ingredientId, String fromUnit, String toUnit, BigDecimal quantity, Integer branchId) {
        
        // 1. Try direct conversion with priority: BRANCH → GLOBAL
        Optional<IngredientUnitConversion> directConversion = findDirectConversionWithPriority(ingredientId, fromUnit, toUnit, branchId);
        
        if (directConversion.isPresent()) {
            log.info("Direct conversion found: factor={}, scope={}, branchId={}", 
                    directConversion.get().getFactor(), 
                    directConversion.get().getScope(),
                    directConversion.get().getBranchId());
            BigDecimal result = quantity.multiply(directConversion.get().getFactor());
            log.info("Direct conversion result: {} * {} = {}", quantity, directConversion.get().getFactor(), result);
            return result;
        } else {
            log.info("No direct conversion found");
        }

        // 2. Try reverse conversion with priority: BRANCH → GLOBAL
        Optional<IngredientUnitConversion> reverseConversion = findReverseConversionWithPriority(ingredientId, fromUnit, toUnit, branchId);
        
        if (reverseConversion.isPresent()) {
            log.info("Reverse conversion found: factor={}, scope={}, branchId={}", 
                    reverseConversion.get().getFactor(), 
                    reverseConversion.get().getScope(),
                    reverseConversion.get().getBranchId());
            BigDecimal result = quantity.divide(reverseConversion.get().getFactor(), 4, RoundingMode.HALF_UP);
            log.info("Reverse conversion result: {} / {} = {}", quantity, reverseConversion.get().getFactor(), result);
            return result;
        } else {
            log.info("No reverse conversion found");
        }

        // 3. Try conversion through base unit with priority: BRANCH → GLOBAL
        log.info("Looking for base unit conversion with priority");
        Optional<IngredientUnitConversion> toBase = findBaseConversionWithPriority(ingredientId, fromUnit, "BASE", branchId);
        Optional<IngredientUnitConversion> fromBase = findBaseConversionWithPriority(ingredientId, "BASE", toUnit, branchId);

        log.info("Base conversions found: toBase={}, fromBase={}", toBase.isPresent(), fromBase.isPresent());
        
        if (toBase.isPresent() && fromBase.isPresent()) {
            log.info("Base unit conversion found: toBase factor={}, fromBase factor={}", 
                    toBase.get().getFactor(), fromBase.get().getFactor());
            // Convert to base unit first, then to target unit
            BigDecimal baseQuantity = quantity.multiply(toBase.get().getFactor());
            BigDecimal result = baseQuantity.multiply(fromBase.get().getFactor());
            log.info("Base unit conversion result: {} * {} * {} = {}", 
                    quantity, toBase.get().getFactor(), fromBase.get().getFactor(), result);
            return result;
        } else {
            log.info("No base unit conversion found");
        }

        throw new IllegalArgumentException(
            String.format("Cannot convert from %s to %s for ingredient %d - different dimensions and no specific conversion rule", fromUnit, toUnit, ingredientId)
        );
    }

    /**
     * Find direct conversion with priority: BRANCH → GLOBAL
     */
    private Optional<IngredientUnitConversion> findDirectConversionWithPriority(Integer ingredientId, String fromUnit, String toUnit, Integer branchId) {
        if (branchId != null) {
            // 1. Try BRANCH-specific first (highest priority)
            log.info("Looking for BRANCH-specific direct conversion: branchId={}", branchId);
            Optional<IngredientUnitConversion> branchConversion = conversionRepository.findBranchSpecificConversion(
                ingredientId, fromUnit, toUnit, branchId);
            
            if (branchConversion.isPresent()) {
                log.info("BRANCH-specific direct conversion found: factor={}, branchId={}", 
                        branchConversion.get().getFactor(), branchConversion.get().getBranchId());
                return branchConversion;
            }
            
            // 2. Try GLOBAL as fallback
            log.info("No BRANCH-specific found, trying GLOBAL direct conversion");
            Optional<IngredientUnitConversion> globalConversion = conversionRepository.findGlobalConversion(
                ingredientId, fromUnit, toUnit);
            
            if (globalConversion.isPresent()) {
                log.info("GLOBAL direct conversion found: factor={}", globalConversion.get().getFactor());
                return globalConversion;
            }
        } else {
            // No branch context - try GLOBAL only
            log.info("No branch context, trying GLOBAL direct conversion");
            return conversionRepository.findGlobalConversion(ingredientId, fromUnit, toUnit);
        }
        
        return Optional.empty();
    }

    /**
     * Find reverse conversion with priority: BRANCH → GLOBAL
     */
    private Optional<IngredientUnitConversion> findReverseConversionWithPriority(Integer ingredientId, String fromUnit, String toUnit, Integer branchId) {
        if (branchId != null) {
            // 1. Try BRANCH-specific reverse first (highest priority)
            log.info("Looking for BRANCH-specific reverse conversion: branchId={}", branchId);
            Optional<IngredientUnitConversion> branchReverse = conversionRepository.findBranchSpecificReverseConversion(
                ingredientId, fromUnit, toUnit, branchId);
            
            if (branchReverse.isPresent()) {
                log.info("BRANCH-specific reverse conversion found: factor={}, branchId={}", 
                        branchReverse.get().getFactor(), branchReverse.get().getBranchId());
                return branchReverse;
            }
            
            // 2. Try GLOBAL reverse as fallback
            log.info("No BRANCH-specific reverse found, trying GLOBAL reverse conversion");
            Optional<IngredientUnitConversion> globalReverse = conversionRepository.findGlobalReverseConversion(
                ingredientId, fromUnit, toUnit);
            
            if (globalReverse.isPresent()) {
                log.info("GLOBAL reverse conversion found: factor={}", globalReverse.get().getFactor());
                return globalReverse;
            }
        } else {
            // No branch context - try GLOBAL only
            log.info("No branch context, trying GLOBAL reverse conversion");
            return conversionRepository.findGlobalReverseConversion(ingredientId, fromUnit, toUnit);
        }
        
        return Optional.empty();
    }

    /**
     * Find base unit conversion with priority: BRANCH → GLOBAL
     */
    private Optional<IngredientUnitConversion> findBaseConversionWithPriority(Integer ingredientId, String fromUnit, String toUnit, Integer branchId) {
        if (branchId != null) {
            // 1. Try BRANCH-specific base first (highest priority)
            log.info("Looking for BRANCH-specific base conversion: branchId={}", branchId);
            Optional<IngredientUnitConversion> branchBase = conversionRepository.findBranchSpecificBaseConversion(
                ingredientId, fromUnit, toUnit, branchId);
            
            if (branchBase.isPresent()) {
                log.info("BRANCH-specific base conversion found: factor={}, branchId={}", 
                        branchBase.get().getFactor(), branchBase.get().getBranchId());
                return branchBase;
            }
            
            // 2. Try GLOBAL base as fallback
            log.info("No BRANCH-specific base found, trying GLOBAL base conversion");
            Optional<IngredientUnitConversion> globalBase = conversionRepository.findGlobalBaseConversion(
                ingredientId, fromUnit, toUnit);
            
            if (globalBase.isPresent()) {
                log.info("GLOBAL base conversion found: factor={}", globalBase.get().getFactor());
                return globalBase;
            }
        } else {
            // No branch context - try GLOBAL only
            log.info("No branch context, trying GLOBAL base conversion");
            return conversionRepository.findGlobalBaseConversion(ingredientId, fromUnit, toUnit);
        }
        
        return Optional.empty();
    }

    /**
     * Check if conversion is possible between two units for a specific ingredient
     * @param ingredientId The ingredient ID
     * @param fromUnit The source unit code
     * @param toUnit The target unit code
     * @return true if conversion is possible, false otherwise
     */
    public boolean canConvert(Integer ingredientId, String fromUnit, String toUnit) {
        try {
            // Get unit information
            Optional<Unit> fromUnitInfo = unitRepository.findByCode(fromUnit);
            Optional<Unit> toUnitInfo = unitRepository.findByCode(toUnit);
            
            if (fromUnitInfo.isEmpty() || toUnitInfo.isEmpty()) {
                return false;
            }

            Unit from = fromUnitInfo.get();
            Unit to = toUnitInfo.get();

            // Same dimension - always can convert using base unit
            if (from.getDimension().equals(to.getDimension())) {
                return true;
            }

            // Different dimensions - check if ingredient-specific conversion exists
            return hasIngredientSpecificConversion(ingredientId, fromUnit, toUnit);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Check if ingredient-specific conversion exists
     */
    private boolean hasIngredientSpecificConversion(Integer ingredientId, String fromUnit, String toUnit) {
        // Check direct conversion (active only)
        if (conversionRepository.findByIngredientIdAndFromUnitCodeAndToUnitCodeAndIsActiveTrue(ingredientId, fromUnit, toUnit).isPresent()) {
            return true;
        }

        // Check reverse conversion (active only)
        if (conversionRepository.findByIngredientIdAndFromUnitCodeAndToUnitCodeAndIsActiveTrue(ingredientId, toUnit, fromUnit).isPresent()) {
            return true;
        }

        // Check conversion through base unit (active only)
        boolean toBaseExists = conversionRepository.findByIngredientIdAndFromUnitCodeAndToUnitCodeAndIsActiveTrue(ingredientId, fromUnit, "BASE").isPresent();
        boolean fromBaseExists = conversionRepository.findByIngredientIdAndFromUnitCodeAndToUnitCodeAndIsActiveTrue(ingredientId, "BASE", toUnit).isPresent();
        
        return toBaseExists && fromBaseExists;
    }

    /**
     * Get conversion factor between two units for a specific ingredient
     * @param ingredientId The ingredient ID
     * @param fromUnit The source unit code
     * @param toUnit The target unit code
     * @return Conversion factor
     * @throws IllegalArgumentException if conversion is not possible
     */
    public BigDecimal getConversionFactor(Integer ingredientId, String fromUnit, String toUnit) {
        return getConversionFactor(ingredientId, fromUnit, toUnit, null);
    }

    public BigDecimal getConversionFactor(Integer ingredientId, String fromUnit, String toUnit, Integer branchId) {
        
        if (fromUnit.equals(toUnit)) {
            log.info("Same units, returning 1.0");
            return BigDecimal.ONE;
        }

        // Get unit information
        Optional<Unit> fromUnitInfo = unitRepository.findByCode(fromUnit);
        Optional<Unit> toUnitInfo = unitRepository.findByCode(toUnit);
        
        if (fromUnitInfo.isEmpty() || toUnitInfo.isEmpty()) {
            log.error("Unit not found: fromUnit={}, toUnit={}", fromUnit, toUnit);
            throw new IllegalArgumentException("Unit not found: " + fromUnit + " or " + toUnit);
        }

        Unit from = fromUnitInfo.get();
        Unit to = toUnitInfo.get();
        log.info("Units found: from={} (dimension: {}, baseUnit: {}), to={} (dimension: {}, baseUnit: {})", 
                from.getCode(), from.getDimension(), from.getBaseUnit().getCode(),
                to.getCode(), to.getDimension(), to.getBaseUnit().getCode());

        // Same dimension - use base unit conversion
        if (from.getDimension().equals(to.getDimension())) {
            log.info("Same dimension conversion: {} -> {}", from.getDimension(), to.getDimension());
            // Both units should have the same base unit for same dimension conversion
            if (!from.getBaseUnit().getCode().equals(to.getBaseUnit().getCode())) {
                log.error("Different base units: {} vs {}", from.getBaseUnit().getCode(), to.getBaseUnit().getCode());
                throw new IllegalArgumentException(
                    String.format("Units %s and %s have different base units (%s vs %s)", 
                        from.getCode(), to.getCode(), 
                        from.getBaseUnit().getCode(), to.getBaseUnit().getCode())
                );
            }
            BigDecimal conversionFactor = from.getFactorToBase().divide(to.getFactorToBase(), 8, RoundingMode.HALF_UP);
            log.info("Same dimension conversion factor: {} / {} = {}", 
                    from.getFactorToBase(), to.getFactorToBase(), conversionFactor);
            return conversionFactor;
        }

        // Different dimensions - use ingredient-specific conversion
        log.info("Different dimensions, checking ingredient-specific conversions");
        BigDecimal result = getIngredientSpecificConversionFactor(ingredientId, fromUnit, toUnit, branchId);
        log.info("Ingredient-specific conversion factor: {}", result);
        return result;
    }

    /**
     * Get conversion factor for different dimensions using ingredient-specific conversions
     */

    private BigDecimal getIngredientSpecificConversionFactor(Integer ingredientId, String fromUnit, String toUnit, Integer branchId) {
        
        // 1. Try direct conversion with priority: BRANCH → GLOBAL
        Optional<IngredientUnitConversion> directConversion = findDirectConversionWithPriority(ingredientId, fromUnit, toUnit, branchId);
        
        if (directConversion.isPresent()) {
            log.info("Direct conversion found: factor={}, scope={}, branchId={}", 
                    directConversion.get().getFactor(), 
                    directConversion.get().getScope(),
                    directConversion.get().getBranchId());
            return directConversion.get().getFactor();
        } else {
            log.info("No direct conversion found");
        }

        // 2. Try reverse conversion with priority: BRANCH → GLOBAL
        Optional<IngredientUnitConversion> reverseConversion = findReverseConversionWithPriority(ingredientId, fromUnit, toUnit, branchId);
        
        if (reverseConversion.isPresent()) {
            log.info("Reverse conversion found: factor={}, scope={}, branchId={}", 
                    reverseConversion.get().getFactor(), 
                    reverseConversion.get().getScope(),
                    reverseConversion.get().getBranchId());
            BigDecimal result = BigDecimal.ONE.divide(reverseConversion.get().getFactor(), 4, RoundingMode.HALF_UP);
            log.info("Reverse conversion result: 1 / {} = {}", reverseConversion.get().getFactor(), result);
            return result;
        } else {
            log.info("No reverse conversion found");
        }

        // 3. Try conversion through base unit with priority: BRANCH → GLOBAL
        log.info("Looking for base unit conversion with priority");
        Optional<IngredientUnitConversion> toBase = findBaseConversionWithPriority(ingredientId, fromUnit, "BASE", branchId);
        Optional<IngredientUnitConversion> fromBase = findBaseConversionWithPriority(ingredientId, "BASE", toUnit, branchId);

        log.info("Base conversions found: toBase={}, fromBase={}", toBase.isPresent(), fromBase.isPresent());
        
        if (toBase.isPresent() && fromBase.isPresent()) {
            log.info("Base unit conversion found: toBase factor={}, fromBase factor={}", 
                    toBase.get().getFactor(), fromBase.get().getFactor());
            BigDecimal result = toBase.get().getFactor().multiply(fromBase.get().getFactor());
            log.info("Base unit conversion result: {} * {} = {}", 
                    toBase.get().getFactor(), fromBase.get().getFactor(), result);
            return result;
        } else {
            log.info("No base unit conversion found");
        }

        throw new IllegalArgumentException(
            String.format("Cannot convert from %s to %s for ingredient %d - different dimensions and no specific conversion rule", fromUnit, toUnit, ingredientId)
        );
    }

    /**
     * Create a new unit conversion for an ingredient
     * @param request The conversion request
     * @return Created conversion response
     */
    public IngredientUnitConversionResponse createConversion(CreateIngredientUnitConversionRequest request) {
        // Check if conversion already exists
        Optional<IngredientUnitConversion> existing = conversionRepository
                .findByIngredientIdAndFromUnitCodeAndToUnitCode(
                    request.getIngredientId(), 
                    request.getFromUnitCode(), 
                    request.getToUnitCode()
                );
        
        if (existing.isPresent()) {
            throw new IllegalArgumentException("Conversion already exists for this ingredient and units");
        }

        // Create new conversion
        IngredientUnitConversion conversion = IngredientUnitConversion.builder()
                .ingredientId(request.getIngredientId())
                .fromUnitCode(request.getFromUnitCode())
                .toUnitCode(request.getToUnitCode())
                .factor(request.getFactor())
                .note(request.getDescription())
                .scope(request.getScope() != null ? request.getScope() : IngredientUnitConversion.ConversionScope.GLOBAL)
                .branchId(request.getBranchId())
                .build();

        IngredientUnitConversion saved = conversionRepository.save(conversion);

        return IngredientUnitConversionResponse.builder()
                .id(saved.getId())
                .ingredientId(saved.getIngredientId())
                .fromUnitCode(saved.getFromUnitCode())
                .toUnitCode(saved.getToUnitCode())
                .factor(saved.getFactor())
                .description(saved.getNote())
                .isActive(saved.getIsActive())
                .scope(saved.getScope())
                .branchId(saved.getBranchId())
                .createAt(saved.getCreateAt())
                .updateAt(saved.getUpdatedAt())
                .build();
    }

    /**
     * Get all conversions for ADMIN (GLOBAL only)
     * @return List of GLOBAL conversions
     */
    public List<IngredientUnitConversionResponse> getAllGlobalConversions() {
        List<IngredientUnitConversion> conversions = conversionRepository
                .findByScope(IngredientUnitConversion.ConversionScope.GLOBAL);
        
        return conversions.stream()
                .map(this::convertToResponse)
                .toList();
    }

    /**
     * Get all conversions for MANAGER/STAFF (GLOBAL + branch-specific)
     * @param branchId The branch ID
     * @return List of conversions available for the branch
     */
    public List<IngredientUnitConversionResponse> getConversionsForBranch(Integer branchId) {
        List<IngredientUnitConversion> conversions = conversionRepository
                .findByGlobalAndBranch(branchId);
        
        return conversions.stream()
                .map(this::convertToResponse)
                .toList();
    }

    /**
     * Get all conversions for a specific ingredient (GLOBAL + branch-specific)
     * @param ingredientId The ingredient ID
     * @param branchId The branch ID (null for ADMIN)
     * @return List of conversions for the ingredient
     */
    public List<IngredientUnitConversionResponse> getConversionsForIngredient(Integer ingredientId, Integer branchId) {
        List<IngredientUnitConversion> conversions;
        
        if (branchId == null) {
            // ADMIN: get all conversions for ingredient
            conversions = conversionRepository.findByIngredientId(ingredientId);
        } else {
            // MANAGER/STAFF: get GLOBAL + branch-specific conversions
            conversions = conversionRepository.findByIngredientIdWithGlobalAndBranch(ingredientId, branchId);
        }
        
        return conversions.stream()
                .map(this::convertToResponse)
                .toList();
    }

    /**
     * Get all conversions for a specific ingredient (GLOBAL only for ADMIN)
     * @param ingredientId The ingredient ID
     * @return List of GLOBAL conversions for the ingredient
     */
    public List<IngredientUnitConversionResponse> getGlobalConversionsForIngredient(Integer ingredientId) {
        List<IngredientUnitConversion> conversions = conversionRepository
                .findByIngredientIdAndScope(ingredientId, IngredientUnitConversion.ConversionScope.GLOBAL);
        
        return conversions.stream()
                .map(this::convertToResponse)
                .toList();
    }

    /**
     * Update conversion status (active/inactive)
     */
    public IngredientUnitConversionResponse updateConversionStatus(Long conversionId, Boolean isActive) {
        IngredientUnitConversion conversion = conversionRepository.findById(conversionId)
                .orElseThrow(() -> new RuntimeException("Conversion not found with id: " + conversionId));
        
        conversion.setIsActive(isActive);
        IngredientUnitConversion updated = conversionRepository.save(conversion);
        
        return convertToResponse(updated);
    }

    /**
     * Update conversion details
     */
    public IngredientUnitConversionResponse updateConversion(Long conversionId, CreateIngredientUnitConversionRequest request) {
        IngredientUnitConversion conversion = conversionRepository.findById(conversionId)
                .orElseThrow(() -> new RuntimeException("Conversion not found with id: " + conversionId));
        
        // Check for duplicate conversion (excluding current one)
        boolean duplicateExists = conversionRepository.existsByIngredientIdAndFromUnitCodeAndToUnitCodeAndIdNot(
                request.getIngredientId(), 
                request.getFromUnitCode(), 
                request.getToUnitCode(), 
                conversionId
        );
        
        if (duplicateExists) {
            throw new RuntimeException("Conversion already exists for this ingredient and units");
        }
        
        // Update conversion details
        conversion.setIngredientId(request.getIngredientId());
        conversion.setFromUnitCode(request.getFromUnitCode());
        conversion.setToUnitCode(request.getToUnitCode());
        conversion.setFactor(request.getFactor());
        conversion.setNote(request.getDescription());
        conversion.setScope(request.getScope() != null ? request.getScope() : IngredientUnitConversion.ConversionScope.GLOBAL);
        conversion.setBranchId(request.getBranchId());
        
        IngredientUnitConversion updated = conversionRepository.save(conversion);
        
        return convertToResponse(updated);
    }

    /**
     * Convert entity to response DTO
     */
    private IngredientUnitConversionResponse convertToResponse(IngredientUnitConversion conversion) {
        return IngredientUnitConversionResponse.builder()
                .id(conversion.getId())
                .ingredientId(conversion.getIngredientId())
                .fromUnitCode(conversion.getFromUnitCode())
                .toUnitCode(conversion.getToUnitCode())
                .factor(conversion.getFactor())
                .description(conversion.getNote())
                .isActive(conversion.getIsActive())
                .scope(conversion.getScope())
                .branchId(conversion.getBranchId())
                .createAt(conversion.getCreateAt())
                .updateAt(conversion.getUpdatedAt())
                .build();
    }
}
