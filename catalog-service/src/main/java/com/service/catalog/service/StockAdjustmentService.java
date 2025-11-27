package com.service.catalog.service;

import com.service.catalog.dto.request.stock.DailyStockReconciliationRequest;
import com.service.catalog.dto.request.stock.ManagerStockAdjustmentRequest;
import com.service.catalog.dto.request.stock.UpdateStockAdjustmentRequest;
import com.service.catalog.dto.response.stock.DailyStockReconciliationResponse;
import com.service.catalog.dto.response.stock.DailyUsageSummaryResponse;
import com.service.catalog.dto.response.stock.StockAdjustmentResponse;
import com.service.catalog.entity.Ingredient;
import com.service.catalog.entity.InventoryTransaction;
import com.service.catalog.entity.Stock;
import com.service.catalog.entity.StockAdjustment;
import com.service.catalog.entity.StockAdjustment.AdjustmentStatus;
import com.service.catalog.entity.StockAdjustment.AdjustmentType;
import com.service.catalog.entity.StockAdjustmentEntry;
import com.service.catalog.entity.StockReservation;
import com.service.catalog.exception.AppException;
import com.service.catalog.exception.ErrorCode;
import com.service.catalog.repository.IngredientRepository;
import com.service.catalog.repository.InventoryTransactionRepository;
import com.service.catalog.repository.StockAdjustmentEntryRepository;
import com.service.catalog.repository.StockAdjustmentRepository;
import com.service.catalog.repository.StockRepository;
import com.service.catalog.repository.StockReservationRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockAdjustmentService {

    private static final String STOCK_ADJUSTMENT_REF = "STOCK_ADJUSTMENT";
    private static final String REASON_DAILY = "DAILY_RECONCILIATION";
    private static final String REASON_MANAGER = "MANAGER_RECOUNT";
    private static final String REASON_FORCE_OVERRIDE = "FORCE_OVERRIDE";
    private static final String SOURCE_MANAGER_FORCE = "MANAGER_FORCE";
    private static final String SOURCE_MANAGER_RECOUNT = "MANAGER_RECOUNT";
    private static final int CLOSING_BUFFER_MINUTES = 15;

    private final StockRepository stockRepository;
    private final StockReservationRepository stockReservationRepository;
    private final StockAdjustmentRepository stockAdjustmentRepository;
    private final StockAdjustmentEntryRepository stockAdjustmentEntryRepository;
    private final IngredientRepository ingredientRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final InventoryAlertService inventoryAlertService;
    private final BranchScheduleService branchScheduleService;

    @Transactional
    public DailyStockReconciliationResponse reconcile(DailyStockReconciliationRequest request) {
        Map<Integer, BigDecimal> systemUsageMap = preloadSystemUsage(request.getBranchId(), request.getAdjustmentDate());

        List<DailyStockReconciliationResponse.DailyStockReconciliationResult> results = new ArrayList<>();
        int committed = 0;
        BigDecimal totalVariance = BigDecimal.ZERO;

        for (DailyStockReconciliationRequest.DailyStockAdjustmentItemRequest item : request.getItems()) {
            Ingredient ingredient = ingredientRepository.findById(item.getIngredientId())
                    .orElseThrow(() -> new AppException(ErrorCode.INGREDIENT_NOT_FOUND));

            StockAdjustment adjustment = findOrCreateAdjustment(
                    request.getBranchId(),
                    ingredient,
                    request.getAdjustmentDate(),
                    request.getAdjustedBy(),
                    request.getUserId(),
                    item.getNotes());

            BigDecimal entryQuantity = item.getActualUsedQuantity();
            StockAdjustmentEntry entry = StockAdjustmentEntry.builder()
                    .adjustment(adjustment)
                    .branchId(request.getBranchId())
                    .ingredientId(ingredient.getIngredientId())
                    .entryQuantity(entryQuantity)
                    .recordedBy(request.getAdjustedBy())
                    .userId(request.getUserId())
                    .entryTime(LocalDateTime.now())
                    .notes(item.getNotes())
                    .source("MANUAL")
                    .build();
            stockAdjustmentEntryRepository.save(entry);

            int newEntryCount = adjustment.getEntryCount() == null ? 1 : adjustment.getEntryCount() + 1;
            adjustment.setEntryCount(newEntryCount);
            adjustment.setLastEntryAt(entry.getEntryTime());

            BigDecimal previousVariance = adjustment.getVariance() != null ? adjustment.getVariance() : BigDecimal.ZERO;
            BigDecimal systemQuantity = systemUsageMap.getOrDefault(item.getIngredientId(), BigDecimal.ZERO);
            adjustment.setSystemQuantity(systemQuantity);

            BigDecimal newActualQuantity = (adjustment.getActualQuantity() != null ? adjustment.getActualQuantity() : BigDecimal.ZERO)
                    .add(entryQuantity);
            adjustment.setActualQuantity(newActualQuantity);

            BigDecimal variance = newActualQuantity.subtract(systemQuantity);
            adjustment.setVariance(variance);
            adjustment.setQuantity(variance.abs());
            adjustment.setAdjustmentType(variance.compareTo(BigDecimal.ZERO) >= 0 ? AdjustmentType.ADJUST_OUT : AdjustmentType.ADJUST_IN);
            adjustment.setStatus(AdjustmentStatus.PENDING);

            stockAdjustmentRepository.save(adjustment);

            if (request.isCommitImmediately()) {
                manualCommit(adjustment.getAdjustmentId());
                committed++;
                adjustment = stockAdjustmentRepository.findById(adjustment.getAdjustmentId())
                        .orElseThrow(() -> new AppException(ErrorCode.ADJUSTMENT_NOT_FOUND));
            }

            totalVariance = totalVariance.add(variance.subtract(previousVariance));
            results.add(buildResult(
                    adjustment,
                    entry,
                    request.isCommitImmediately() ? adjustment.getStatus().name() : AdjustmentStatus.PENDING.name()));
        }

        return DailyStockReconciliationResponse.builder()
                .branchId(request.getBranchId())
                .adjustmentDate(request.getAdjustmentDate())
                .processedItems(results.size())
                .committedItems(committed)
                .totalVariance(totalVariance)
                .results(results)
                .build();
    }

    @Transactional
    public void manualCommit(Long adjustmentId) {
        StockAdjustment adjustment = stockAdjustmentRepository.findById(adjustmentId)
                .orElseThrow(() -> new AppException(ErrorCode.ADJUSTMENT_NOT_FOUND));
        if (adjustment.getStatus() == AdjustmentStatus.COMMITTED || adjustment.getStatus() == AdjustmentStatus.AUTO_COMMITTED) {
            return;
        }
        
        // Tính lại system_quantity theo thời gian thực khi commit
        recalculateAndUpdateAdjustment(adjustment);
        applyAdjustment(adjustment, false);
    }

    @Transactional
    public StockAdjustmentResponse recordManagerAdjustment(ManagerStockAdjustmentRequest request) {
        Stock stock = stockRepository.findByBranchIdAndIngredientIngredientId(request.getBranchId(), request.getIngredientId())
                .orElseThrow(() -> new AppException(ErrorCode.STOCK_NOT_FOUND));

        BigDecimal physicalQuantity = request.getPhysicalQuantity();
        if (physicalQuantity == null || physicalQuantity.compareTo(BigDecimal.ZERO) < 0) {
            throw new AppException(ErrorCode.INVALID_PHYSICAL_QUANTITY);
        }

        boolean forceOverride = Boolean.TRUE.equals(request.getForceAdjust());
        validateManagerAdjustmentWindow(request.getBranchId(), forceOverride, request.getReason());

        BigDecimal currentQuantity = stock.getQuantity();
        BigDecimal variance = physicalQuantity.subtract(currentQuantity);

        if (variance.abs().compareTo(BigDecimal.ZERO) == 0) {
            throw new AppException(ErrorCode.NO_STOCK_CHANGE);
        }

        LocalDate adjustmentDate = request.getAdjustmentDate() != null ? request.getAdjustmentDate() : LocalDate.now();
        Ingredient ingredient = stock.getIngredient();

        String normalizedReason = (request.getReason() != null && !request.getReason().isBlank())
                ? request.getReason().trim()
                : REASON_MANAGER;

        String finalNotes = request.getNotes();
        if (forceOverride) {
            String forceTag = "Force override during business hours";
            finalNotes = (finalNotes == null || finalNotes.isBlank())
                    ? forceTag
                    : finalNotes + " | " + forceTag;
        }

        StockAdjustment adjustment = StockAdjustment.builder()
                .branchId(stock.getBranchId())
                .ingredient(ingredient)
                .adjustmentType(variance.compareTo(BigDecimal.ZERO) >= 0 ? AdjustmentType.ADJUST_IN : AdjustmentType.ADJUST_OUT)
                .status(AdjustmentStatus.PENDING)
                .quantity(variance.abs())
                .systemQuantity(currentQuantity)
                .actualQuantity(physicalQuantity)
                .variance(variance)
                .reason(forceOverride ? normalizedReason + ":" + REASON_FORCE_OVERRIDE : normalizedReason)
                .userId(request.getUserId())
                .adjustedBy(request.getAdjustedBy())
                .adjustmentDate(adjustmentDate)
                .notes(finalNotes)
                .entryCount(0)
                .build();

        adjustment = stockAdjustmentRepository.save(adjustment);

        StockAdjustmentEntry entry = StockAdjustmentEntry.builder()
                .adjustment(adjustment)
                .branchId(stock.getBranchId())
                .ingredientId(ingredient.getIngredientId())
                .entryQuantity(physicalQuantity)
                .recordedBy(request.getAdjustedBy())
                .userId(request.getUserId())
                .entryTime(LocalDateTime.now())
                .notes(finalNotes)
                .source(forceOverride ? SOURCE_MANAGER_FORCE : SOURCE_MANAGER_RECOUNT)
                .build();
        stockAdjustmentEntryRepository.save(entry);

        adjustment.setEntryCount(1);
        adjustment.setLastEntryAt(entry.getEntryTime());
        adjustment = stockAdjustmentRepository.save(adjustment);

        applyAdjustment(adjustment, false);
        return toResponse(adjustment);
    }

    @Transactional
    public StockAdjustmentResponse updateAdjustment(Long adjustmentId, UpdateStockAdjustmentRequest request) {
        StockAdjustment adjustment = stockAdjustmentRepository.findById(adjustmentId)
                .orElseThrow(() -> new AppException(ErrorCode.ADJUSTMENT_NOT_FOUND));

        // Chỉ cho phép sửa PENDING adjustments
        if (adjustment.getStatus() != AdjustmentStatus.PENDING) {
            throw new AppException(ErrorCode.ADJUSTMENT_NOT_PENDING);
        }

        // Cập nhật actual quantity và notes
        BigDecimal newActualQuantity = request.getActualQuantity();
        adjustment.setActualQuantity(newActualQuantity);
        
        if (request.getNotes() != null) {
            adjustment.setNotes(request.getNotes());
        }

        // Tính lại variance và quantity
        BigDecimal systemQuantity = adjustment.getSystemQuantity();
        BigDecimal variance = newActualQuantity.subtract(systemQuantity);
        adjustment.setVariance(variance);

        // Xác định lại adjustment type và quantity
        if (variance.abs().compareTo(BigDecimal.ZERO) == 0) {
            // Nếu variance = 0, có thể xóa adjustment này hoặc giữ nguyên
            // Ở đây ta giữ nguyên nhưng đặt quantity = 0
            adjustment.setQuantity(BigDecimal.ZERO);
            adjustment.setAdjustmentType(AdjustmentType.ADJUST_IN); // Mặc định
        } else {
            AdjustmentType adjustmentType = variance.compareTo(BigDecimal.ZERO) > 0 
                    ? AdjustmentType.ADJUST_OUT 
                    : AdjustmentType.ADJUST_IN;
            adjustment.setAdjustmentType(adjustmentType);
            adjustment.setQuantity(variance.abs());
        }

        adjustment.setUpdatedAt(LocalDateTime.now());
        StockAdjustment saved = stockAdjustmentRepository.save(adjustment);
        return toResponse(saved);
    }

    @Transactional
    public void deleteAdjustment(Long adjustmentId) {
        StockAdjustment adjustment = stockAdjustmentRepository.findById(adjustmentId)
                .orElseThrow(() -> new AppException(ErrorCode.ADJUSTMENT_NOT_FOUND));

        // Chỉ cho phép xóa PENDING hoặc CANCELLED adjustments
        if (adjustment.getStatus() == AdjustmentStatus.COMMITTED || 
            adjustment.getStatus() == AdjustmentStatus.AUTO_COMMITTED) {
            throw new AppException(ErrorCode.ADJUSTMENT_ALREADY_COMMITTED);
        }

        stockAdjustmentRepository.delete(adjustment);
    }

    @Transactional
    public int autoCommitPendingAdjustments() {
        List<Integer> branchIds = stockAdjustmentRepository.findBranchIdsWithPendingAdjustments();
        if (branchIds == null || branchIds.isEmpty()) {
            return 0;
        }

        int totalCommitted = 0;
        for (Integer branchId : branchIds) {
            if (branchId == null) {
                continue;
            }
            try {
                totalCommitted += autoCommitBranchAdjustments(branchId);
            } catch (Exception ex) {
                log.error("Failed to auto commit adjustments for branch {}", branchId, ex);
            }
        }
        return totalCommitted;
    }

    public Page<StockAdjustmentResponse> searchAdjustments(Integer branchId,
                                                           LocalDate adjustmentDate,
                                                           AdjustmentStatus status,
                                                           int page,
                                                           int size) {
        Page<StockAdjustment> adjustments = stockAdjustmentRepository.searchAdjustments(
                branchId,
                adjustmentDate,
                status,
                PageRequest.of(page, size));
        return adjustments.map(this::toResponse);
    }

    public DailyUsageSummaryResponse getDailyUsageSummary(Integer branchId, LocalDate date) {
        // 1. Lấy system quantity từ stock_reservations COMMITTED
        Map<Integer, BigDecimal> systemUsageMap = preloadSystemUsage(branchId, date);

        // 2. Lấy danh sách adjustments đã có cho ngày này
        List<Integer> ingredientIds = new ArrayList<>(systemUsageMap.keySet());
        List<StockAdjustment> existingAdjustments = ingredientIds.isEmpty()
                ? stockAdjustmentRepository.findByBranchIdAndAdjustmentDate(branchId, date)
                : stockAdjustmentRepository.findByBranchIdAndDateAndIngredientIds(branchId, date, ingredientIds);

        List<StockAdjustment> dailyAdjustments = existingAdjustments.stream()
                .filter(adj -> adj.getReason() == null || REASON_DAILY.equals(adj.getReason()))
                .collect(Collectors.toList());

        if (systemUsageMap.isEmpty() && dailyAdjustments.isEmpty()) {
            return DailyUsageSummaryResponse.builder()
                    .branchId(branchId)
                    .date(date)
                    .items(List.of())
                    .build();
        }
        Map<Integer, StockAdjustment> adjustmentMap = dailyAdjustments.stream()
                .collect(Collectors.toMap(
                        adj -> adj.getIngredient().getIngredientId(),
                        adj -> adj,
                        (existing, replacement) -> existing // Nếu có nhiều, lấy cái đầu tiên
                ));

        // 3. Build response items
        List<DailyUsageSummaryResponse.DailyUsageItem> items = new ArrayList<>();
        for (Map.Entry<Integer, BigDecimal> entry : systemUsageMap.entrySet()) {
            Integer ingredientId = entry.getKey();
            BigDecimal systemQty = entry.getValue();

            Ingredient ingredient = ingredientRepository.findById(ingredientId)
                    .orElse(null);
            if (ingredient == null) continue;

            StockAdjustment adjustment = adjustmentMap.get(ingredientId);
            boolean hasAdjustment = adjustment != null;

            DailyUsageSummaryResponse.DailyUsageItem.DailyUsageItemBuilder itemBuilder = DailyUsageSummaryResponse.DailyUsageItem.builder()
                    .ingredientId(ingredientId)
                    .ingredientName(ingredient.getName())
                    .unitCode(ingredient.getUnit() != null ? ingredient.getUnit().getCode() : null)
                    .unitName(ingredient.getUnit() != null ? ingredient.getUnit().getName() : null)
                    .systemQuantity(systemQty)
                    .hasAdjustment(hasAdjustment);

            if (hasAdjustment) {
                itemBuilder
                        .actualQuantity(adjustment.getActualQuantity())
                        .variance(adjustment.getVariance())
                        .adjustmentStatus(adjustment.getStatus().name())
                        .entryCount(adjustment.getEntryCount())
                        .lastEntryAt(adjustment.getLastEntryAt());
            }

            items.add(itemBuilder.build());
        }

        // 4. Thêm các adjustments không có trong systemUsageMap (ví dụ: chỉ ghi nhận nhưng chưa có đơn hàng)
        dailyAdjustments.stream()
                .filter(adj -> !systemUsageMap.containsKey(adj.getIngredient().getIngredientId()))
                .forEach(adj -> {
                    Ingredient ingredient = adj.getIngredient();
                    DailyUsageSummaryResponse.DailyUsageItem item = DailyUsageSummaryResponse.DailyUsageItem.builder()
                            .ingredientId(ingredient.getIngredientId())
                            .ingredientName(ingredient.getName())
                            .unitCode(ingredient.getUnit() != null ? ingredient.getUnit().getCode() : null)
                            .unitName(ingredient.getUnit() != null ? ingredient.getUnit().getName() : null)
                            .systemQuantity(BigDecimal.ZERO)
                            .hasAdjustment(true)
                            .actualQuantity(adj.getActualQuantity())
                            .variance(adj.getVariance())
                            .adjustmentStatus(adj.getStatus().name())
                            .entryCount(adj.getEntryCount())
                            .lastEntryAt(adj.getLastEntryAt())
                            .build();
                    items.add(item);
                });

        // Sort by ingredient name
        items.sort((a, b) -> a.getIngredientName().compareToIgnoreCase(b.getIngredientName()));

        return DailyUsageSummaryResponse.builder()
                .branchId(branchId)
                .date(date)
                .items(items)
                .build();
    }

    private void validateManagerAdjustmentWindow(Integer branchId,
                                                 boolean forceOverride,
                                                 String providedReason) {
        LocalTime openingTime = branchScheduleService.getOpeningTime(branchId);
        LocalTime closingTime = branchScheduleService.getClosingTime(branchId);

        if (openingTime == null || closingTime == null) {
            return;
        }

        if (isWithinBusinessWindow(LocalDateTime.now(), openingTime, closingTime)) {
            if (!forceOverride) {
                throw new AppException(ErrorCode.ADJUSTMENT_BLOCKED_DURING_BUSINESS);
            }
            if (providedReason == null || providedReason.isBlank()) {
                throw new AppException(ErrorCode.ADJUSTMENT_FORCE_REASON_REQUIRED);
            }
        }
    }

    private boolean isWithinBusinessWindow(LocalDateTime now,
                                           LocalTime openingTime,
                                           LocalTime closingTime) {
        LocalDate today = now.toLocalDate();
        LocalDateTime openDateTime = LocalDateTime.of(today, openingTime);
        LocalDateTime closeDateTime = LocalDateTime.of(today, closingTime);

        if (!closingTime.isAfter(openingTime)) {
            if (now.isBefore(openDateTime)) {
                openDateTime = openDateTime.minusDays(1);
            } else {
                closeDateTime = closeDateTime.plusDays(1);
            }
        }

        closeDateTime = closeDateTime.plusMinutes(CLOSING_BUFFER_MINUTES);
        return !now.isBefore(openDateTime) && now.isBefore(closeDateTime);
    }

    private StockAdjustment findOrCreateAdjustment(Integer branchId,
                                                   Ingredient ingredient,
                                                   LocalDate adjustmentDate,
                                                   String adjustedBy,
                                                   Integer userId,
                                                   String notes) {
        return stockAdjustmentRepository
                .findByBranchIdAndIngredientIngredientIdAndAdjustmentDate(
                        branchId,
                        ingredient.getIngredientId(),
                        adjustmentDate)
                .orElseGet(() -> {
                    StockAdjustment adjustment = StockAdjustment.builder()
                            .branchId(branchId)
                            .ingredient(ingredient)
                            .adjustmentType(AdjustmentType.ADJUST_OUT)
                            .status(AdjustmentStatus.PENDING)
                            .quantity(BigDecimal.ZERO)
                            .systemQuantity(BigDecimal.ZERO)
                            .actualQuantity(BigDecimal.ZERO)
                            .variance(BigDecimal.ZERO)
                            .entryCount(0)
                            .reason(REASON_DAILY)
                            .userId(userId)
                            .adjustedBy(adjustedBy)
                            .adjustmentDate(adjustmentDate)
                            .notes(notes)
                            .build();
                    return stockAdjustmentRepository.save(adjustment);
                });
    }

    private int autoCommitBranchAdjustments(Integer branchId) {
        LocalTime closingTime = branchScheduleService.getClosingTime(branchId);
        LocalTime openingTime = branchScheduleService.getOpeningTime(branchId);

        List<StockAdjustment> pendingAdjustments = stockAdjustmentRepository.findByBranchIdAndStatus(branchId, AdjustmentStatus.PENDING);
        int committed = 0;
        for (StockAdjustment adjustment : pendingAdjustments) {
            if (readyForAutoCommit(adjustment.getAdjustmentDate(), openingTime, closingTime)) {
                // Tính lại system_quantity theo thời gian thực khi auto-commit
                recalculateAndUpdateAdjustment(adjustment);
                applyAdjustment(adjustment, true);
                committed++;
            }
        }
        return committed;
    }

    private boolean readyForAutoCommit(LocalDate adjustmentDate, LocalTime open, LocalTime close) {
        if (close == null) {
            close = LocalTime.of(23, 0);
        }
        if (open == null) {
            open = LocalTime.of(6, 0);
        }
        LocalDate closingDate = adjustmentDate;
        if (close.isBefore(open)) {
            closingDate = closingDate.plusDays(1);
        }
        LocalDateTime cutoff = LocalDateTime.of(closingDate, close).plusMinutes(15);
        return LocalDateTime.now().isAfter(cutoff);
    }

    /**
     * Tính lại system_quantity và cập nhật adjustment trước khi commit
     * Xử lý trường hợp adjustment được tạo trước khi có đơn hàng
     */
    private void recalculateAndUpdateAdjustment(StockAdjustment adjustment) {
        // Tính lại system_quantity từ stock_reservations COMMITTED trong ngày
        Map<Integer, BigDecimal> systemUsageMap = preloadSystemUsage(
                adjustment.getBranchId(), 
                adjustment.getAdjustmentDate());
        
        BigDecimal newSystemQuantity = systemUsageMap.getOrDefault(
                adjustment.getIngredient().getIngredientId(), 
                BigDecimal.ZERO);
        
        BigDecimal oldSystemQuantity = adjustment.getSystemQuantity();
        BigDecimal actualQuantity = adjustment.getActualQuantity();
        
        // Tính lại variance và quantity
        BigDecimal newVariance = actualQuantity.subtract(newSystemQuantity);
        BigDecimal newQuantity = newVariance.abs();
        
        // Kiểm tra xem có thay đổi đáng kể không
        boolean hasSignificantChange = false;
        String changeReason = "";
        
        // Nếu variance đổi dấu (từ + sang - hoặc ngược lại)
        if (adjustment.getVariance().compareTo(BigDecimal.ZERO) * newVariance.compareTo(BigDecimal.ZERO) < 0) {
            hasSignificantChange = true;
            changeReason = "Variance changed sign";
        }
        
        // Nếu quantity thay đổi > 10% hoặc > 0.1 đơn vị
        BigDecimal quantityDiff = newQuantity.subtract(adjustment.getQuantity()).abs();
        BigDecimal percentChange = adjustment.getQuantity().compareTo(BigDecimal.ZERO) > 0
                ? quantityDiff.divide(adjustment.getQuantity(), 4, java.math.RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100))
                : BigDecimal.ZERO;
        
        if (percentChange.compareTo(BigDecimal.valueOf(10)) > 0 || quantityDiff.compareTo(BigDecimal.valueOf(0.1)) > 0) {
            hasSignificantChange = true;
            changeReason = String.format("Quantity changed by %.2f%% (%.4f units)", 
                    percentChange.doubleValue(), quantityDiff.doubleValue());
        }
        
        // Nếu variance = 0, có thể hủy adjustment
        if (newVariance.abs().compareTo(BigDecimal.ZERO) == 0) {
            log.warn("[StockAdjustment] Adjustment {} variance is now 0, but proceeding with commit", 
                    adjustment.getAdjustmentId());
        }
        
        // Log thay đổi nếu có
        if (hasSignificantChange) {
            log.warn("[StockAdjustment] Adjustment {} recalculated before commit. Reason: {}. " +
                            "Old: system={}, variance={}, quantity={}, type={}. " +
                            "New: system={}, variance={}, quantity={}, type={}",
                    adjustment.getAdjustmentId(),
                    changeReason,
                    oldSystemQuantity, adjustment.getVariance(), adjustment.getQuantity(), adjustment.getAdjustmentType(),
                    newSystemQuantity, newVariance, newQuantity,
                    newVariance.compareTo(BigDecimal.ZERO) > 0 ? AdjustmentType.ADJUST_OUT : AdjustmentType.ADJUST_IN);
        } else if (!oldSystemQuantity.equals(newSystemQuantity)) {
            log.info("[StockAdjustment] Adjustment {} system_quantity updated from {} to {} before commit",
                    adjustment.getAdjustmentId(), oldSystemQuantity, newSystemQuantity);
        }
        
        // Cập nhật adjustment với giá trị mới
        adjustment.setSystemQuantity(newSystemQuantity);
        adjustment.setVariance(newVariance);
        adjustment.setQuantity(newQuantity);
        
        // Xác định lại adjustment_type
        AdjustmentType newType = newVariance.compareTo(BigDecimal.ZERO) > 0 
                ? AdjustmentType.ADJUST_OUT 
                : AdjustmentType.ADJUST_IN;
        adjustment.setAdjustmentType(newType);
        
        // Cập nhật timestamp
        adjustment.setUpdatedAt(LocalDateTime.now());
        
        // Lưu lại adjustment đã cập nhật
        stockAdjustmentRepository.save(adjustment);
    }

    private Map<Integer, BigDecimal> preloadSystemUsage(Integer branchId, LocalDate date) {
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.plusDays(1).atStartOfDay();
        List<Object[]> raw = stockReservationRepository.sumCommittedQuantityByBranchAndDate(branchId, start, end, StockReservation.ReservationStatus.COMMITTED);
        if (raw == null || raw.isEmpty()) {
            return Map.of();
        }
        return raw.stream().collect(Collectors.toMap(
                row -> (Integer) row[0],
                row -> toBigDecimal(row[1])
        ));
    }

    private void applyAdjustment(StockAdjustment adjustment, boolean autoCommit) {
        Stock stock = stockRepository.findByBranchIdAndIngredientIngredientId(adjustment.getBranchId(),
                        adjustment.getIngredient().getIngredientId())
                .orElseThrow(() -> new AppException(ErrorCode.STOCK_NOT_FOUND));

        BigDecimal before = stock.getQuantity();
        BigDecimal delta = adjustment.getQuantity();
        BigDecimal after = adjustment.getAdjustmentType() == AdjustmentType.ADJUST_OUT
                ? before.subtract(delta)
                : before.add(delta);

        if (after.compareTo(BigDecimal.ZERO) < 0) {
            throw new AppException(ErrorCode.INSUFFICIENT_STOCK);
        }

        stock.setQuantity(after);
        stock.setLastUpdated(LocalDateTime.now());
        stockRepository.save(stock);
        inventoryAlertService.evaluateAndPublish(stock);

        BigDecimal unitPrice = defaultUnitPrice(adjustment.getIngredient());
        InventoryTransaction txn = InventoryTransaction.builder()
                .branchId(adjustment.getBranchId())
                .ingredient(adjustment.getIngredient())
                .txnType(adjustment.getAdjustmentType().name())
                .qtyIn(adjustment.getAdjustmentType() == AdjustmentType.ADJUST_IN ? delta : BigDecimal.ZERO)
                .qtyOut(adjustment.getAdjustmentType() == AdjustmentType.ADJUST_OUT ? delta : BigDecimal.ZERO)
                .unit(stock.getUnit() != null ? stock.getUnit() : adjustment.getIngredient().getUnit())
                .unitPrice(unitPrice)
                .lineTotal(unitPrice.multiply(delta))
                .refType(STOCK_ADJUSTMENT_REF)
                .refId(String.valueOf(adjustment.getAdjustmentId()))
                .beforeQty(before)
                .afterQty(after)
                .note(adjustment.getNotes())
                .createAt(LocalDateTime.now())
                .build();
        inventoryTransactionRepository.save(txn);

        adjustment.setStatus(autoCommit ? AdjustmentStatus.AUTO_COMMITTED : AdjustmentStatus.COMMITTED);
        adjustment.setUpdatedAt(LocalDateTime.now());
        stockAdjustmentRepository.save(adjustment);
    }

    private DailyStockReconciliationResponse.DailyStockReconciliationResult buildResult(StockAdjustment adjustment,
                                                                                        StockAdjustmentEntry entry,
                                                                                        String status) {
        Ingredient ingredient = adjustment.getIngredient();
        return DailyStockReconciliationResponse.DailyStockReconciliationResult.builder()
                .ingredientId(ingredient.getIngredientId())
                .ingredientName(ingredient.getName())
                .systemQuantity(adjustment.getSystemQuantity())
                .actualQuantity(adjustment.getActualQuantity())
                .variance(adjustment.getVariance())
                .adjustmentType(adjustment.getAdjustmentType() != null ? adjustment.getAdjustmentType().name() : null)
                .status(status)
                .adjustmentId(adjustment.getAdjustmentId())
                .notes(entry != null ? entry.getNotes() : adjustment.getNotes())
                .entryId(entry != null ? entry.getEntryId() : null)
                .entryQuantity(entry != null ? entry.getEntryQuantity() : null)
                .entryTime(entry != null ? entry.getEntryTime() : null)
                .entryCount(adjustment.getEntryCount())
                .lastEntryAt(adjustment.getLastEntryAt())
                .build();
    }

    private BigDecimal defaultUnitPrice(Ingredient ingredient) {
        return ingredient.getUnitPrice() != null ? ingredient.getUnitPrice() : BigDecimal.ZERO;
    }

    private StockAdjustmentResponse toResponse(StockAdjustment adjustment) {
        return StockAdjustmentResponse.builder()
                .adjustmentId(adjustment.getAdjustmentId())
                .branchId(adjustment.getBranchId())
                .ingredientId(adjustment.getIngredient() != null ? adjustment.getIngredient().getIngredientId() : null)
                .ingredientName(adjustment.getIngredient() != null ? adjustment.getIngredient().getName() : null)
                .adjustmentType(adjustment.getAdjustmentType().name())
                .status(adjustment.getStatus().name())
                .quantity(adjustment.getQuantity())
                .systemQuantity(adjustment.getSystemQuantity())
                .actualQuantity(adjustment.getActualQuantity())
                .variance(adjustment.getVariance())
                .adjustmentDate(adjustment.getAdjustmentDate())
                .notes(adjustment.getNotes())
                .adjustedBy(adjustment.getAdjustedBy())
                .userId(adjustment.getUserId())
                .entryCount(adjustment.getEntryCount())
                .lastEntryAt(adjustment.getLastEntryAt())
                .reason(adjustment.getReason())
                .createdAt(adjustment.getCreatedAt())
                .updatedAt(adjustment.getUpdatedAt())
                .build();
    }

    public StockAdjustmentResponse getAdjustment(Long adjustmentId) {
        StockAdjustment adjustment = stockAdjustmentRepository.findById(adjustmentId)
                .orElseThrow(() -> new AppException(ErrorCode.ADJUSTMENT_NOT_FOUND));
        return toResponse(adjustment);
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value instanceof BigDecimal bigDecimal) {
            return bigDecimal;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        return BigDecimal.ZERO;
    }
}

