package com.service.catalog.service;

import com.service.catalog.dto.request.stock.CheckAndReserveRequest;
import com.service.catalog.dto.request.stock.CommitReservationRequest;
import com.service.catalog.dto.request.stock.ReleaseReservationRequest;
import com.service.catalog.dto.response.stock.CheckAndReserveResponse;
import com.service.catalog.dto.response.stock.InsufficientStockResponse;
import com.service.catalog.entity.Stock;
import com.service.catalog.entity.StockReservation;
import com.service.catalog.entity.Recipe;
import com.service.catalog.entity.RecipeItem;
import com.service.catalog.exception.InsufficientStockException;
import com.service.catalog.repository.StockRepository;
import com.service.catalog.repository.StockReservationRepository;
import com.service.catalog.dto.response.ApiResponse;
import com.service.catalog.repository.http_client.OrderClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class StockReservationService {
    
    private final StockReservationRepository stockReservationRepository;
    private final StockRepository stockRepository;
    private final RecipeService recipeService;
    private final OrderClient orderClient;
    private final UnitConversionService unitConversionService;
    private final InventoryAlertService inventoryAlertService;
    
    // TTL cho reservation (15 phút)
    private static final int RESERVATION_TTL_MINUTES = 15;
    
    /**
     * Kiểm tra và giữ chỗ tồn kho
     */
    @Transactional
    public CheckAndReserveResponse checkAndReserve(CheckAndReserveRequest request) {
        log.info("Checking and reserving stock for branch: {}, items: {}", request.getBranchId(), request.getItems());
        
        // 0. Validate branch và cart tồn tại
        validateBranchAndCart(request.getBranchId(), request.getCartId());
        
        // 0.1. Validate productDetailId tồn tại
        validateProductDetails(request.getItems());
        
        // 0.2. Validate trạng thái đăng nhập
        validateUserSession(request.getCartId(), request.getGuestId());
        
        // 1. Tính toán nguyên liệu cần thiết với đổi đơn vị
        Map<Integer, BigDecimal> requiredIngredients = calculateRequiredIngredientsWithUnitConversion(request.getItems(), request.getBranchId());
        log.debug("Required ingredients with unit conversion: {}", requiredIngredients);
        
        // 1.1. Kiểm tra có recipe không
        if (requiredIngredients.isEmpty()) {
            log.warn("No recipes found for the requested items");
            InsufficientStockResponse response = InsufficientStockResponse.builder()
                .message("No recipes found for the requested items")
                .insufficientIngredients(new ArrayList<>())
                .build();
            throw new InsufficientStockException(response);
        }
        
        // 2. Kiểm tra tồn kho khả dụng
        List<InsufficientStockResponse.InsufficientIngredient> errors = checkStockAvailability(request.getBranchId(), requiredIngredients);
        
        if (!errors.isEmpty()) {
            log.warn("Insufficient stock found: {}", errors);
            InsufficientStockResponse response = InsufficientStockResponse.builder()
                .message("Insufficient stock for some ingredients")
                .insufficientIngredients(errors)
                .build();
            throw new InsufficientStockException("Insufficient stock for some ingredients", response);
        }
        
        // 3. Tạo reservations
        String reservationGroupId = generateReservationGroupId();
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(RESERVATION_TTL_MINUTES);
        
        List<StockReservation> reservations = createReservations(
            reservationGroupId, 
            request.getBranchId(), 
            requiredIngredients, 
            expiresAt,
            request.getCartId(),
            request.getGuestId()
        );
        
        // 4. Tăng reservedQuantity trong Stock để đánh dấu đã được đặt chỗ
        for (StockReservation reservation : reservations) {
            try {
                Optional<Stock> stockOpt = stockRepository.findByBranchIdAndIngredientIngredientId(
                    reservation.getBranchId(), reservation.getIngredientId());
                
                if (stockOpt.isPresent()) {
                    Stock stock = stockOpt.get();
                    BigDecimal currentReservedQuantity = stock.getReservedQuantity();
                    BigDecimal newReservedQuantity = currentReservedQuantity.add(reservation.getQuantityReserved());
                    
                    stock.setReservedQuantity(newReservedQuantity);
                    stock.setLastUpdated(LocalDateTime.now());
                    stockRepository.save(stock);
                    
                    log.debug("Increased reservedQuantity for ingredient {}: {} -> {}", 
                            reservation.getIngredientId(), currentReservedQuantity, newReservedQuantity);
                }
            } catch (Exception e) {
                log.error("Error updating reservedQuantity for ingredient {}: {}", 
                        reservation.getIngredientId(), e.getMessage());
                // Không throw exception để không rollback toàn bộ transaction
            }
        }
        
        // 5. Lưu reservations
        List<StockReservation> savedReservations = stockReservationRepository.saveAll(reservations);
        log.info("Created {} reservations with group ID: {}", savedReservations.size(), reservationGroupId);
        
        // 6. Tạo response
        return CheckAndReserveResponse.builder()
            .holdId(reservationGroupId)
            .expiresAt(expiresAt)
            .ingredientSummaries(createIngredientSummaries(savedReservations))
            .itemSummaries(createItemSummaries(request.getItems()))
            .build();
    }
    
    /**
     * Commit reservation (trừ kho thật)
     */
    @Transactional
    public void commitReservation(CommitReservationRequest request) {
        log.info("Committing reservation: {}", request.getHoldId());
        
        // 1. Tìm reservations theo group ID
        List<StockReservation> reservations = stockReservationRepository.findByReservationGroupIdAndStatus(
            request.getHoldId(), StockReservation.ReservationStatus.ACTIVE);
        
        if (reservations.isEmpty()) {
            throw new IllegalArgumentException("No active reservations found for hold ID: " + request.getHoldId());
        }
        
        // 2. Trừ kho thật cho từng reservation
        for (StockReservation reservation : reservations) {
            try {
                // Lấy stock hiện tại
                Optional<Stock> stockOpt = stockRepository.findByBranchIdAndIngredientIngredientId(
                    reservation.getBranchId(), reservation.getIngredientId());
                
                if (stockOpt.isEmpty()) {
                    log.error("Stock not found for ingredient {} in branch {}", 
                            reservation.getIngredientId(), reservation.getBranchId());
                    throw new IllegalStateException("Stock not found for ingredient " + reservation.getIngredientId());
                }
                
                Stock stock = stockOpt.get();
                BigDecimal currentQuantity = stock.getQuantity();
                BigDecimal reservedQuantity = stock.getReservedQuantity();
                BigDecimal quantityToDeduct = reservation.getQuantityReserved();
                
                // Kiểm tra có đủ kho không
                if (currentQuantity.compareTo(quantityToDeduct) < 0) {
                    log.error("Insufficient stock for ingredient {}: current={}, required={}", 
                            reservation.getIngredientId(), currentQuantity, quantityToDeduct);
                    throw new IllegalStateException("Insufficient stock for ingredient " + reservation.getIngredientId());
                }
                
                // Trừ kho thật và giảm reservedQuantity (vì đã trừ kho thật rồi, không cần reserve nữa)
                BigDecimal newQuantity = currentQuantity.subtract(quantityToDeduct);
                BigDecimal newReservedQuantity = reservedQuantity.subtract(quantityToDeduct);
                
                // Đảm bảo reservedQuantity không âm (phòng trường hợp có lỗi logic trước đó)
                if (newReservedQuantity.compareTo(BigDecimal.ZERO) < 0) {
                    log.warn("ReservedQuantity would be negative for ingredient {}: {}, setting to 0", 
                            reservation.getIngredientId(), newReservedQuantity);
                    newReservedQuantity = BigDecimal.ZERO;
                }
                
                stock.setQuantity(newQuantity);
                stock.setReservedQuantity(newReservedQuantity);
                stock.setLastUpdated(LocalDateTime.now());
                
                stockRepository.save(stock);
                inventoryAlertService.evaluateAndPublish(stock);
                
                log.info("Deducted stock for ingredient {}: {} -> {} (reserved: {} -> {})", 
                        reservation.getIngredientId(), currentQuantity, newQuantity, 
                        reservedQuantity, newReservedQuantity);
                
            } catch (Exception e) {
                log.error("Error deducting stock for ingredient {}: {}", 
                        reservation.getIngredientId(), e.getMessage());
                throw new RuntimeException("Failed to deduct stock for ingredient " + reservation.getIngredientId(), e);
            }
        }
        
        // 3. Cập nhật status thành COMMITTED và set order ID
        LocalDateTime now = LocalDateTime.now();
        stockReservationRepository.updateStatusByGroupId(
            request.getHoldId(), 
            StockReservation.ReservationStatus.COMMITTED, 
            now
        );
        
        if (request.getOrderId() != null) {
            stockReservationRepository.updateOrderIdByGroupId(
                request.getHoldId(), 
                request.getOrderId(), 
                now
            );
        }
        
        log.info("Successfully committed reservation and deducted stock: {}", request.getHoldId());
    }
    
    /**
     * Release reservation (hoàn trả)
     */
    @Transactional
    public void releaseReservation(ReleaseReservationRequest request) {
        log.info("Releasing reservation: {}", request.getHoldId());
        
        // 1. Tìm reservations theo group ID
        List<StockReservation> reservations = stockReservationRepository.findByReservationGroupIdAndStatus(
            request.getHoldId(), StockReservation.ReservationStatus.ACTIVE);
        
        if (reservations.isEmpty()) {
            log.warn("No active reservations found for hold ID: {}", request.getHoldId());
            return;
        }
        
        // 2. Giảm reservedQuantity trong Stock (hoàn trả lại vì không commit)
        for (StockReservation reservation : reservations) {
            try {
                Optional<Stock> stockOpt = stockRepository.findByBranchIdAndIngredientIngredientId(
                    reservation.getBranchId(), reservation.getIngredientId());
                
                if (stockOpt.isPresent()) {
                    Stock stock = stockOpt.get();
                    BigDecimal currentReservedQuantity = stock.getReservedQuantity();
                    BigDecimal newReservedQuantity = currentReservedQuantity.subtract(reservation.getQuantityReserved());
                    
                    // Đảm bảo reservedQuantity không âm
                    if (newReservedQuantity.compareTo(BigDecimal.ZERO) < 0) {
                        log.warn("ReservedQuantity would be negative for ingredient {}: {}, setting to 0", 
                                reservation.getIngredientId(), newReservedQuantity);
                        newReservedQuantity = BigDecimal.ZERO;
                    }
                    
                    stock.setReservedQuantity(newReservedQuantity);
                    stock.setLastUpdated(LocalDateTime.now());
                    stockRepository.save(stock);
                    
                    log.debug("Decreased reservedQuantity for ingredient {}: {} -> {}", 
                            reservation.getIngredientId(), currentReservedQuantity, newReservedQuantity);
                }
            } catch (Exception e) {
                log.error("Error updating reservedQuantity for ingredient {}: {}", 
                        reservation.getIngredientId(), e.getMessage());
                // Không throw exception để không rollback toàn bộ transaction
            }
        }
        
        // 3. Cập nhật status thành RELEASED
        stockReservationRepository.updateStatusByGroupId(
            request.getHoldId(), 
            StockReservation.ReservationStatus.RELEASED, 
            LocalDateTime.now()
        );
        
        log.info("Successfully released reservation: {}", request.getHoldId());
    }
    
    /**
     * Lấy holdId từ orderId
     */
    public String getHoldIdByOrderId(Integer orderId) {
        log.info("Getting hold ID for order: {}", orderId);
        
        List<StockReservation> reservations = stockReservationRepository.findByOrderId(orderId);
        if (reservations.isEmpty()) {
            log.warn("No reservations found for order: {}", orderId);
            return null;
        }
        
        // Lấy reservation group ID từ reservation đầu tiên
        String holdId = reservations.get(0).getReservationGroupId();
        log.info("Found hold ID {} for order {}", holdId, orderId);
        return holdId;
    }

    /**
     * Cập nhật orderId cho reservations theo holdId
     */
    @Transactional
    public void updateOrderIdForReservations(String holdId, Integer orderId) {
        log.info("Updating order ID {} for reservations with hold ID: {}", orderId, holdId);
        
        // Tìm tất cả reservations với holdId
        List<StockReservation> reservations = stockReservationRepository.findByReservationGroupIdAndStatus(
            holdId, StockReservation.ReservationStatus.ACTIVE);
        
        if (reservations.isEmpty()) {
            log.warn("No active reservations found for hold ID: {}", holdId);
            return;
        }
        
        // Cập nhật orderId cho tất cả reservations
        stockReservationRepository.updateOrderIdByGroupId(holdId, orderId, LocalDateTime.now());
        
        log.info("Successfully updated order ID {} for {} reservations with hold ID: {}", 
                orderId, reservations.size(), holdId);
    }

    /**
     * Cập nhật orderId cho reservations theo cartId hoặc guestId
     */
    @Transactional
    public void updateOrderIdForReservationsByCartOrGuest(Integer orderId, Integer cartId, String guestId) {
        log.info("Updating order ID {} for reservations with cartId: {}, guestId: {}", orderId, cartId, guestId);
        
        try {
            List<StockReservation> reservations;
            
            if (cartId != null) {
                // Tìm reservations theo cartId
                log.info("Searching reservations by cartId: {}", cartId);
                reservations = stockReservationRepository.findByCartId(cartId);
                log.info("Found {} reservations for cartId: {}", reservations.size(), cartId);
            } else if (guestId != null) {
                // Tìm reservations theo guestId
                log.info("Searching reservations by guestId: {}", guestId);
                reservations = stockReservationRepository.findByGuestId(guestId);
                log.info("Found {} reservations for guestId: {}", reservations.size(), guestId);
            } else {
                log.warn("Both cartId and guestId are null, cannot update reservations");
                throw new IllegalArgumentException("Both cartId and guestId are null");
            }
            
            if (reservations.isEmpty()) {
                log.warn("No active reservations found for cartId: {}, guestId: {}", cartId, guestId);
                throw new IllegalStateException("No reservations found for the given cartId/guestId");
            }
            
            // Lấy holdId từ reservation mới nhất (theo created_at)
            StockReservation latestReservation = reservations.stream()
                .max((r1, r2) -> r1.getCreatedAt().compareTo(r2.getCreatedAt()))
                .orElse(null);
                
            if (latestReservation == null) {
                log.error("Latest reservation is null");
                throw new IllegalStateException("Latest reservation is null");
            }
            
            String holdId = latestReservation.getReservationGroupId();
            if (holdId == null) {
                log.error("HoldId is null for latest reservation: {}", latestReservation.getReservationId());
                throw new IllegalStateException("HoldId is null for latest reservation");
            }
            
            log.info("Using holdId: {} for updating reservations", holdId);
            
            // Cập nhật orderId cho tất cả reservations
            log.info("Calling updateOrderIdByGroupId with holdId: {}, orderId: {}", holdId, orderId);
            int updatedRows = stockReservationRepository.updateOrderIdByGroupId(holdId, orderId, LocalDateTime.now());
            log.info("Updated {} rows in database", updatedRows);
            
            // Kiểm tra nếu không update được rows nào thì báo lỗi
            if (updatedRows == 0) {
                log.error("Failed to update any reservations - Updated 0 rows for holdId: {}, orderId: {}", holdId, orderId);
                throw new IllegalStateException("Failed to update reservations: No rows were updated for holdId " + holdId);
            }
            
            log.info("Successfully updated order ID {} for {} reservations with hold ID: {}", 
                    orderId, reservations.size(), holdId);
        } catch (Exception e) {
            log.error("Error in updateOrderIdForReservationsByCartOrGuest: ", e);
            throw e; // Re-throw để controller có thể handle
        }
    }

    /**
     * Cleanup expired reservations
     */
    @Transactional
    public int cleanupExpiredReservations() {
        log.info("Cleaning up expired reservations");
        
        LocalDateTime now = LocalDateTime.now();
        List<StockReservation> expiredReservations = stockReservationRepository.findExpiredReservations(now);
        
        if (expiredReservations.isEmpty()) {
            log.debug("No expired reservations found");
            return 0;
        }
        
        // Nhóm reservations theo groupId để xử lý từng nhóm
        Map<String, List<StockReservation>> reservationsByGroup = expiredReservations.stream()
            .collect(Collectors.groupingBy(StockReservation::getReservationGroupId));
        
        int totalUpdated = 0;
        
        for (Map.Entry<String, List<StockReservation>> entry : reservationsByGroup.entrySet()) {
            String groupId = entry.getKey();
            List<StockReservation> groupReservations = entry.getValue();
            
            // Giảm reservedQuantity trong Stock cho từng reservation trong nhóm
            for (StockReservation reservation : groupReservations) {
                try {
                    Optional<Stock> stockOpt = stockRepository.findByBranchIdAndIngredientIngredientId(
                        reservation.getBranchId(), reservation.getIngredientId());
                    
                    if (stockOpt.isPresent()) {
                        Stock stock = stockOpt.get();
                        BigDecimal currentReservedQuantity = stock.getReservedQuantity();
                        BigDecimal newReservedQuantity = currentReservedQuantity.subtract(reservation.getQuantityReserved());
                        
                        // Đảm bảo reservedQuantity không âm
                        if (newReservedQuantity.compareTo(BigDecimal.ZERO) < 0) {
                            log.warn("ReservedQuantity would be negative for ingredient {}: {}, setting to 0", 
                                    reservation.getIngredientId(), newReservedQuantity);
                            newReservedQuantity = BigDecimal.ZERO;
                        }
                        
                        stock.setReservedQuantity(newReservedQuantity);
                        stock.setLastUpdated(LocalDateTime.now());
                        stockRepository.save(stock);
                        
                        log.debug("Decreased reservedQuantity for expired reservation - ingredient {}: {} -> {}", 
                                reservation.getIngredientId(), currentReservedQuantity, newReservedQuantity);
                    }
                } catch (Exception e) {
                    log.error("Error updating reservedQuantity for expired reservation ingredient {}: {}", 
                            reservation.getIngredientId(), e.getMessage());
                    // Không throw exception để không rollback toàn bộ transaction
                }
            }
            
            // Cập nhật status thành RELEASED cho cả nhóm
            int updatedCount = stockReservationRepository.updateStatusByGroupId(
                groupId,
                StockReservation.ReservationStatus.RELEASED,
                now
            );
            
            totalUpdated += updatedCount;
            log.info("Cleaned up {} expired reservations for group {}", updatedCount, groupId);
        }
        
        log.info("Total cleaned up {} expired reservations", totalUpdated);
        return totalUpdated;
    }
    
    /**
     * Cleanup và xoá old expired reservations
     */
    @Transactional
    public Map<String, Integer> cleanupAndDeleteOldReservations() {
        log.info("Starting comprehensive cleanup of reservations");
        
        // Bước 1: Cập nhật expired reservations
        int expiredCount = cleanupExpiredReservations();
        
        // Bước 2: Xoá records đã RELEASED quá 1 giờ
        int deletedCount = stockReservationRepository.deleteOldReleasedReservations();
        
        log.info("Cleanup completed: {} expired, {} deleted", expiredCount, deletedCount);
        
        return Map.of(
            "expired", expiredCount,
            "deleted", deletedCount
        );
    }
    
    
    /**
     * Tính toán nguyên liệu cần thiết với đổi đơn vị từ công thức về đơn vị kho
     */
    private Map<Integer, BigDecimal> calculateRequiredIngredientsWithUnitConversion(
            List<CheckAndReserveRequest.OrderItem> items, Integer branchId) {
        log.info("Calculating required ingredients with unit conversion for {} items in branch {}", items.size(), branchId);
        
        Map<Integer, BigDecimal> totalRequiredIngredients = new HashMap<>();
        
        for (CheckAndReserveRequest.OrderItem item : items) {
            Integer productDetailId = item.getProductDetailId();
            BigDecimal quantity = BigDecimal.valueOf(item.getQuantity());
            
            log.debug("Processing item: productDetailId={}, quantity={}", productDetailId, quantity);
            
            // Lấy recipe cho product detail
            Optional<Recipe> recipeOpt = recipeService.getRecipeByProductDetailId(productDetailId);
            if (recipeOpt.isEmpty()) {
                log.warn("No recipe found for product detail ID: {}", productDetailId);
                continue;
            }
            
            Recipe recipe = recipeOpt.get();
            List<RecipeItem> recipeItems = recipeService.getRecipeItemsByRecipeId(recipe.getRecipeId());
            
            log.debug("Found {} recipe items for product detail {}", recipeItems.size(), productDetailId);
            
            for (RecipeItem recipeItem : recipeItems) {
                Integer ingredientId = recipeItem.getIngredient().getIngredientId();
                String recipeUnit = recipeItem.getUnit().getCode(); // Đơn vị trong công thức
                BigDecimal recipeQuantity = recipeItem.getQty(); // Số lượng trong công thức
                
                // Tính số lượng cần thiết theo công thức
                BigDecimal requiredByRecipe = recipeQuantity
                    .multiply(quantity)
                    .divide(recipe.getYield(), 4, RoundingMode.HALF_UP);
                
                log.debug("Recipe calculation: ingredientId={}, recipeUnit={}, recipeQty={}, yield={}, required={}", 
                        ingredientId, recipeUnit, recipeQuantity, recipe.getYield(), requiredByRecipe);
                
                // Lấy đơn vị của kho cho nguyên liệu này
                String stockUnit = getStockUnitForIngredient(ingredientId, branchId);
                BigDecimal convertedQuantity;
                
                if (stockUnit == null) {
                    // Không có stock → sử dụng đơn vị recipe, không cần chuyển đổi
                    log.warn("No stock found for ingredient {} in branch {}, using recipe unit: {}", ingredientId, branchId, recipeUnit);
                    convertedQuantity = requiredByRecipe;
                } else if (recipeUnit.equals(stockUnit)) {
                    // Cùng đơn vị → không cần chuyển đổi
                    log.debug("Same units for ingredient {}: {} = {}", ingredientId, recipeUnit, stockUnit);
                    convertedQuantity = requiredByRecipe;
                } else {
                    // Khác đơn vị → cần chuyển đổi
                    log.debug("Converting ingredient {} from {} to {}", ingredientId, recipeUnit, stockUnit);
                    convertedQuantity = unitConversionService.convertQuantity(
                        ingredientId, recipeUnit, stockUnit, requiredByRecipe, branchId);
                }
                
                log.debug("Unit conversion: ingredientId={}, from={}, to={}, quantity={}, converted={}", 
                        ingredientId, recipeUnit, stockUnit, requiredByRecipe, convertedQuantity);
                
                // Cộng dồn vào tổng
                totalRequiredIngredients.merge(ingredientId, convertedQuantity, BigDecimal::add);
            }
        }
        
        log.info("Final required ingredients with unit conversion: {}", totalRequiredIngredients);
        return totalRequiredIngredients;
    }
    
    /**
     * Lấy đơn vị của kho cho nguyên liệu
     */
    private String getStockUnitForIngredient(Integer ingredientId, Integer branchId) {
        try {
            Optional<Stock> stockOpt = stockRepository.findByBranchIdAndIngredientIngredientId(branchId, ingredientId);
            if (stockOpt.isPresent()) {
                Stock stock = stockOpt.get();
                if (stock.getUnit() != null) {
                    String unitCode = stock.getUnit().getCode();
                    log.debug("Found stock unit for ingredient {} in branch {}: {}", ingredientId, branchId, unitCode);
                    return unitCode;
                } else {
                    log.warn("Stock unit is null for ingredient {} in branch {}", ingredientId, branchId);
                }
            } else {
                log.debug("No stock found for ingredient {} in branch {}", ingredientId, branchId);
            }
        } catch (Exception e) {
            log.warn("Error getting stock unit for ingredient {} in branch {}: {}", ingredientId, branchId, e.getMessage());
        }
        
        // Fallback: không có stock → trả về null để sử dụng recipe unit
        log.warn("No stock found for ingredient {} in branch {}, will use recipe unit", ingredientId, branchId);
        return null;
    }
    
    /**
     * Kiểm tra tồn kho khả dụng
     */
    private List<InsufficientStockResponse.InsufficientIngredient> checkStockAvailability(
            Integer branchId, Map<Integer, BigDecimal> requiredIngredients) {
        
        List<InsufficientStockResponse.InsufficientIngredient> errors = new ArrayList<>();
        
        log.info("Checking stock availability for branch {} with {} ingredients", branchId, requiredIngredients.size());
        
        for (Map.Entry<Integer, BigDecimal> entry : requiredIngredients.entrySet()) {
            Integer ingredientId = entry.getKey();
            BigDecimal requiredQuantity = entry.getValue();
            
            log.debug("Checking ingredient {} - required: {}", ingredientId, requiredQuantity);
            
            // Lấy stock hiện tại
            Optional<Stock> stockOpt = stockRepository.findByBranchIdAndIngredientIngredientId(branchId, ingredientId);
            
            if (stockOpt.isEmpty()) {
                log.warn("No stock record found for ingredient {} in branch {}", ingredientId, branchId);
                errors.add(createInsufficientIngredientWithUnit(ingredientId, requiredQuantity, BigDecimal.ZERO, "NO_STOCK_RECORD", branchId));
                continue;
            }
            
            Stock stock = stockOpt.get();
            BigDecimal availableQuantity = stock.getAvailableQuantity();
            BigDecimal reservedQuantity = stock.getReservedQuantity();
            BigDecimal totalQuantity = stock.getQuantity();
            
            log.debug("Stock found - ingredient: {}, total: {}, reserved: {}, available: {}", 
                    ingredientId, totalQuantity, reservedQuantity, availableQuantity);
            
            if (availableQuantity.compareTo(requiredQuantity) < 0) {
                log.warn("Insufficient stock - ingredient: {}, required: {}, available: {}", 
                        ingredientId, requiredQuantity, availableQuantity);
                errors.add(createInsufficientIngredientWithUnit(ingredientId, requiredQuantity, availableQuantity, "INSUFFICIENT_STOCK", branchId));
            } else {
                log.debug("Sufficient stock - ingredient: {}, required: {}, available: {}", 
                        ingredientId, requiredQuantity, availableQuantity);
            }
        }
        
        if (!errors.isEmpty()) {
            log.warn("Found {} insufficient ingredients", errors.size());
            errors.forEach(error -> log.warn("Missing ingredient: ID={}, Required={}, Available={}, Shortage={}", 
                    error.getIngredientId(), error.getRequired(), error.getAvailable(), error.getShortage()));
        } else {
            log.info("All ingredients have sufficient stock");
        }
        
        return errors;
    }
    
    /**
     * Tạo reservations
     */
    private List<StockReservation> createReservations(
            String reservationGroupId, 
            Integer branchId, 
            Map<Integer, BigDecimal> requiredIngredients,
            LocalDateTime expiresAt,
            Integer cartId,
            String guestId) {
        
        return requiredIngredients.entrySet().stream()
            .map(entry -> {
                Integer ingredientId = entry.getKey();
                BigDecimal quantity = entry.getValue();
                String unitCode = getStockUnitForIngredient(ingredientId, branchId);
                
                log.debug("Creating reservation for ingredient {}: quantity={}, unit={}", ingredientId, quantity, unitCode);
                
                return StockReservation.builder()
                    .reservationGroupId(reservationGroupId)
                    .branchId(branchId)
                    .ingredientId(ingredientId)
                    .quantityReserved(quantity)
                    .unitCode(unitCode) // Sử dụng đơn vị thực từ Stock
                    .expiresAt(expiresAt)
                    .cartId(cartId)
                    .guestId(guestId)
                    .status(StockReservation.ReservationStatus.ACTIVE)
                    .build();
            })
            .collect(Collectors.toList());
    }
    
    /**
     * Tạo ingredient summaries cho response
     */
    private List<CheckAndReserveResponse.IngredientSummary> createIngredientSummaries(List<StockReservation> reservations) {
        return reservations.stream()
            .map(reservation -> {
                // Lấy thông tin Stock để có availableQuantity thực
                BigDecimal availableQuantity = BigDecimal.ZERO;
                String status = "OUT_OF_STOCK";
                
                try {
                    Optional<Stock> stockOpt = stockRepository.findByBranchIdAndIngredientIngredientId(
                        reservation.getBranchId(), reservation.getIngredientId());
                    
                    if (stockOpt.isPresent()) {
                        Stock stock = stockOpt.get();
                        availableQuantity = stock.getAvailableQuantity();
                        
                        // Tính toán status dựa trên availableQuantity
                        if (availableQuantity.compareTo(BigDecimal.ZERO) > 0) {
                            if (availableQuantity.compareTo(reservation.getQuantityReserved()) >= 0) {
                                status = "IN_STOCK";
                            } else {
                                status = "INSUFFICIENT_STOCK";
                            }
                        } else {
                            status = "OUT_OF_STOCK";
                        }
                        
                        log.debug("Ingredient {} - available: {}, required: {}, status: {}", 
                                reservation.getIngredientId(), availableQuantity, reservation.getQuantityReserved(), status);
                    } else {
                        log.warn("No stock found for ingredient {} in branch {}", 
                                reservation.getIngredientId(), reservation.getBranchId());
                    }
                } catch (Exception e) {
                    log.error("Error getting stock for ingredient {} in branch {}: {}", 
                            reservation.getIngredientId(), reservation.getBranchId(), e.getMessage());
                }
                
                return CheckAndReserveResponse.IngredientSummary.builder()
                    .ingredientId(reservation.getIngredientId())
                    .ingredientName("Ingredient " + reservation.getIngredientId()) // TODO: Lấy từ Ingredient
                    .totalRequired(reservation.getQuantityReserved())
                    .availableQuantity(availableQuantity) // Sử dụng availableQuantity thực
                    .unitCode(reservation.getUnitCode())
                    .status(status) // Tính toán status thực
                    .build();
            })
            .collect(Collectors.toList());
    }
    
    /**
     * Tạo item summaries cho response
     */
    private List<CheckAndReserveResponse.ItemSummary> createItemSummaries(List<CheckAndReserveRequest.OrderItem> items) {
        return items.stream()
            .map(item -> {
                // TODO: Lấy thông tin ProductDetail từ database
                // ProductDetail productDetail = productDetailRepository.findById(item.getProductDetailId());
                
                return CheckAndReserveResponse.ItemSummary.builder()
                    .productDetailId(item.getProductDetailId())
                    .productName("Product " + item.getProductDetailId()) // TODO: Lấy từ ProductDetail
                    .quantity(item.getQuantity())
                    .totalCost(BigDecimal.ZERO) // TODO: Tính toán từ ProductDetail.price
                    .requirements(new ArrayList<>()) // TODO: Lấy từ Recipe
                    .build();
            })
            .collect(Collectors.toList());
    }
    
    
    /**
     * Tạo insufficient ingredient với đơn vị thực
     */
    private InsufficientStockResponse.InsufficientIngredient createInsufficientIngredientWithUnit(
            Integer ingredientId, BigDecimal required, BigDecimal available, String reason, Integer branchId) {
        
        BigDecimal shortage = required.subtract(available);
        String unitCode = getStockUnitForIngredient(ingredientId, branchId);
        
        // Log chi tiết nguyên liệu thiếu
        log.warn("Insufficient ingredient - ID: {}, Required: {}, Available: {}, Shortage: {}, Unit: {}, Reason: {}", 
                ingredientId, required, available, shortage, unitCode, reason);
        
        return InsufficientStockResponse.InsufficientIngredient.builder()
            .ingredientId(ingredientId)
            .ingredientName("Ingredient " + ingredientId) // TODO: Lấy từ Ingredient table
            .required(required)
            .available(available)
            .unitCode(unitCode) // Sử dụng đơn vị thực từ Stock
            .shortage(shortage)
            .build();
    }
    
    /**
     * Generate unique reservation group ID
     */
    private String generateReservationGroupId() {
        return "RES_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8);
    }
    
    /**
     * Validate productDetailId tồn tại
     */
    private void validateProductDetails(List<CheckAndReserveRequest.OrderItem> items) {
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("Items list cannot be null or empty");
        }
        
        for (CheckAndReserveRequest.OrderItem item : items) {
            if (item.getProductDetailId() == null) {
                throw new IllegalArgumentException("ProductDetailId cannot be null");
            }
            if (item.getQuantity() == null || item.getQuantity() <= 0) {
                throw new IllegalArgumentException("Quantity must be greater than 0");
            }
            
            // TODO: Kiểm tra productDetailId có tồn tại trong database không
            // Có thể sử dụng ProductDetailRepository để kiểm tra
            log.debug("Validating productDetailId: {}", item.getProductDetailId());
        }
        
        log.info("All product details validated successfully");
    }
    
    /**
     * Validate branch và cart tồn tại
     * Chỉ validate khi có authentication, bỏ qua cho public endpoint
     */
    private void validateBranchAndCart(Integer branchId, Integer cartId) {
        try {
            // Kiểm tra branch tồn tại
            if (branchId != null) {
                ApiResponse<Object> branchResponse = orderClient.checkBranchExists(branchId);
                if (branchResponse == null || branchResponse.getCode() != 200) {
                    throw new IllegalArgumentException("Branch with ID " + branchId + " does not exist");
                }
                log.info("Branch {} validated successfully", branchId);
            }
            
            // Kiểm tra cart tồn tại (nếu có)
            if (cartId != null) {
                ApiResponse<Object> cartResponse = orderClient.checkCartExists(cartId);
                if (cartResponse == null || cartResponse.getCode() != 200) {
                    throw new IllegalArgumentException("Cart with ID " + cartId + " does not exist");
                }
                log.info("Cart {} validated successfully", cartId);
            }
            
        } catch (Exception e) {
            log.error("Error validating branch/cart: {}", e.getMessage());
            // Chỉ log warning, không throw exception cho public endpoint
            log.warn("Skipping branch/cart validation for public endpoint: {}", e.getMessage());
        }
    }
    
    /**
     * Validate trạng thái đăng nhập và session
     */
    private void validateUserSession(Integer cartId, String guestId) {
        // Kiểm tra logic đăng nhập
        boolean hasCart = cartId != null;
        boolean hasGuest = guestId != null && !guestId.trim().isEmpty();
        
        if (hasCart && hasGuest) {
            log.info("User has both cart and guest ID - authenticated user with guest session");
        } else if (hasCart && !hasGuest) {
            log.info("User has cart only - authenticated user");
        } else if (!hasCart && hasGuest) {
            log.info("User has guest ID only - guest user");
        } else {
            log.warn("User has neither cart nor guest ID - invalid session");
            throw new IllegalArgumentException("Either cartId or guestId must be provided");
        }
        
        log.debug("Session validation passed - cartId: {}, guestId: {}", cartId, guestId);
    }

    /**
     * Xóa tất cả reservations của user/guest
     * @param cartId - Cart ID của user đã đăng nhập (có thể null)
     * @param guestId - Guest ID của guest user (có thể null)
     * @return Số lượng reservations đã xóa
     */
    @Transactional
    public int clearReservationsByCartOrGuest(Integer cartId, String guestId) {
        log.info("Clearing reservations - cartId: {}, guestId: {}", cartId, guestId);
        
        try {
            int deletedCount = 0;
            
            if (cartId != null) {
                // Xóa reservations của user đã đăng nhập
                deletedCount = stockReservationRepository.deleteByCartId(cartId);
                log.info("Deleted {} reservations for cartId: {}", deletedCount, cartId);
            } else if (guestId != null) {
                // Xóa reservations của guest user
                deletedCount = stockReservationRepository.deleteByGuestId(guestId);
                log.info("Deleted {} reservations for guestId: {}", deletedCount, guestId);
            } else {
                log.warn("Both cartId and guestId are null - nothing to clear");
                return 0;
            }
            
            return deletedCount;
        } catch (Exception e) {
            log.error("Error clearing reservations - cartId: {}, guestId: {}", cartId, guestId, e);
            throw new RuntimeException("Failed to clear reservations", e);
        }
    }
}
