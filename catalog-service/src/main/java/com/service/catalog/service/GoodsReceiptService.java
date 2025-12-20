package com.service.catalog.service;

import com.service.catalog.dto.request.goodsReceipt.CreateGoodsReceiptRequest;
import com.service.catalog.dto.response.GoodsReceiptResponse;
import com.service.catalog.dto.response.PoDetailReceiptStatus;
import com.service.catalog.entity.*;
import com.service.catalog.constants.ReceiptStatusConstants;
import com.service.catalog.exception.AppException;
import com.service.catalog.exception.ErrorCode;
import com.service.catalog.mapper.GoodsReceiptMapper;
import com.service.catalog.repository.*;
import com.service.catalog.entity.Stock;
import com.service.catalog.repository.StockRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class GoodsReceiptService {

    private final GoodsReceiptRepository goodsReceiptRepository;
    private final GoodsReceiptDetailRepository goodsReceiptDetailRepository;
    private final PurchaseOrderDetailRepository purchaseOrderDetailRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final SupplierRepository supplierRepository;
    private final IngredientRepository ingredientRepository;
    private final UnitRepository unitRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final StockRepository stockRepository;
    private final InventoryCostRepository inventoryCostRepository;
    private final GoodsReceiptMapper goodsReceiptMapper;
    private final UnitConversionService unitConversionService;
    private final PurchaseOrderStatusHistoryRepository purchaseOrderStatusHistoryRepository;
    private final InventoryAlertService inventoryAlertService;

    @Transactional
    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER')")
    public GoodsReceiptResponse createGoodsReceipt(CreateGoodsReceiptRequest request) {
        validateRequestBasics(request);

        PurchaseOrder po = validateAndGetPurchaseOrder(request.getPoId());
        ensurePoReceivable(po);
        Supplier supplier = validateAndGetSupplier(request.getSupplierId());

        GoodsReceipt goodsReceipt = buildNewGoodsReceipt(po, supplier, request);

        ReceiptBuildResult buildResult = buildReceiptDetails(goodsReceipt, po, request);
        goodsReceipt.setTotalAmount(buildResult.totalAmount);
        goodsReceipt.setDetails(buildResult.details);

        GoodsReceipt savedGRN = goodsReceiptRepository.save(goodsReceipt);
        goodsReceiptDetailRepository.saveAll(buildResult.details);

        createInventoryAndCostForDetails(savedGRN, buildResult.details, request.getBranchId(), po);

        updatePOStatusAfterReceipt(po, buildResult.details);

        log.info("Created goods receipt: {} for PO: {}", savedGRN.getGrnNumber(), po.getPoNumber());
        return goodsReceiptMapper.toGoodsReceiptResponse(savedGRN);
    }

    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER')")
    public List<GoodsReceiptResponse> getGoodsReceiptsByPo(Integer poId) {
        List<GoodsReceipt> receipts = goodsReceiptRepository.findByPurchaseOrderPoId(poId);
        return receipts.stream()
                .map(goodsReceiptMapper::toGoodsReceiptResponse)
                .toList();
    }

    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER')")
    public Page<GoodsReceiptResponse> searchGoodsReceipts(Integer poId,
                                                          Integer supplierId,
                                                          Integer branchId,
                                                          String grnNumber,
                                                          String status,
                                                          LocalDate fromDate,
                                                          LocalDate toDate,
                                                          Pageable pageable) {
        Specification<GoodsReceipt> spec = (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
            if (poId != null) predicates.add(cb.equal(root.get("purchaseOrder").get("poId"), poId));
            if (supplierId != null) predicates.add(cb.equal(root.get("supplier").get("supplierId"), supplierId));
            if (branchId != null) predicates.add(cb.equal(root.get("branchId"), branchId));
            if (grnNumber != null && !grnNumber.isBlank()) predicates.add(cb.like(cb.lower(root.get("grnNumber")), "%" + grnNumber.toLowerCase() + "%"));
            if (status != null && !status.isBlank()) predicates.add(cb.equal(root.get("status"), status));
            if (fromDate != null) predicates.add(cb.greaterThanOrEqualTo(root.get("createAt"), fromDate.atStartOfDay()));
            if (toDate != null) predicates.add(cb.lessThanOrEqualTo(root.get("createAt"), toDate.atTime(23,59,59)));
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
        Page<GoodsReceipt> page = goodsReceiptRepository.findAll(spec, pageable);
        return page.map(goodsReceiptMapper::toGoodsReceiptResponse);
    }

    private String generateGRNNumber() {
        return "GRN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private void updatePOStatusAfterReceipt(PurchaseOrder po, List<GoodsReceiptDetail> details) {
        // Get all PO details to check total quantities
        List<PurchaseOrderDetail> poDetails = purchaseOrderDetailRepository.findByPurchaseOrderPoId(po.getPoId());
        
        // Get all goods receipt details for this PO
        List<GoodsReceiptDetail> allReceiptDetails = goodsReceiptDetailRepository.findByPurchaseOrderPoId(po.getPoId());
        
        boolean allReceived = true;
        boolean hasShortage = false;
        boolean hasDamage = false;
        boolean hasClosingStatus = false; // Check if any detail has closing status (SHORT_ACCEPTED, OVER_ACCEPTED, DAMAGE_ACCEPTED)
        
        // Check each PO detail against total received quantities
        for (PurchaseOrderDetail poDetail : poDetails) {
            BigDecimal totalReceived = allReceiptDetails.stream()
                .filter(detail -> detail.getPurchaseOrderDetail().getId().equals(poDetail.getId()))
                .map(GoodsReceiptDetail::getQtyBase)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            BigDecimal orderedQty = poDetail.getQty();
            
            if (totalReceived.compareTo(orderedQty) < 0) {
                allReceived = false;
                hasShortage = true;
            }
        }
        
        // Check for damage and closing statuses in current receipt
        for (GoodsReceiptDetail detail : details) {
            if ("DAMAGE".equals(detail.getStatus())) {
                hasDamage = true;
            }
            // Check if status closes the receipt (no more receipts allowed)
            if (ReceiptStatusConstants.closesReceipt(detail.getStatus())) {
                hasClosingStatus = true;
            }
        }

        // Update PO status based on receipt results
        String fromStatus = po.getStatus();
        // If all received OR has closing status (SHORT_ACCEPTED, OVER_ACCEPTED, DAMAGE_ACCEPTED), close the PO
        if ((allReceived && !hasShortage && !hasDamage) || hasClosingStatus) {
            po.setStatus("RECEIVED");
        } else {
            po.setStatus("PARTIALLY_RECEIVED");
        }

        po.setUpdateAt(LocalDateTime.now());
        purchaseOrderRepository.save(po);

        // Record status history
        PurchaseOrderStatusHistory history = PurchaseOrderStatusHistory.builder()
                .purchaseOrder(po)
                .fromStatus(fromStatus)
                .toStatus(po.getStatus())
                .changedAt(LocalDateTime.now())
                .note("Updated by GoodsReceipt")
                .build();
        purchaseOrderStatusHistoryRepository.save(history);

        log.info("Updated PO {} status to: {} (allReceived: {}, hasShortage: {}, hasDamage: {})", 
                po.getPoNumber(), po.getStatus(), allReceived, hasShortage, hasDamage);
    }

    private void validateRequestBasics(CreateGoodsReceiptRequest request) {
        if (request.getPoId() == null) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, "PO ID cannot be null");
        }
        if (request.getSupplierId() == null) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, "Supplier ID cannot be null");
        }
        if (request.getBranchId() == null) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, "Branch ID cannot be null");
        }
        if (request.getDetails() == null || request.getDetails().isEmpty()) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, "Details cannot be null or empty");
        }
    }

    private PurchaseOrder validateAndGetPurchaseOrder(Integer poId) {
        return purchaseOrderRepository.findById(poId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND, "Purchase Order not found"));
    }

    private void ensurePoReceivable(PurchaseOrder po) {
        if (!"SUPPLIER_CONFIRMED".equals(po.getStatus()) && !"PARTIALLY_RECEIVED".equals(po.getStatus())) {
            throw new AppException(ErrorCode.VALIDATION_FAILED,
                    "Cannot create goods receipt for PO with status: " + po.getStatus() +
                            ". Only SUPPLIER_CONFIRMED or PARTIALLY_RECEIVED POs can be received.");
        }
    }

    private Supplier validateAndGetSupplier(Integer supplierId) {
        return supplierRepository.findById(supplierId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND, "Supplier not found"));
    }

    private GoodsReceipt buildNewGoodsReceipt(PurchaseOrder po, Supplier supplier, CreateGoodsReceiptRequest request) {
        return GoodsReceipt.builder()
                .grnNumber(generateGRNNumber())
                .purchaseOrder(po)
                .supplier(supplier)
                .branchId(request.getBranchId())
                .totalAmount(BigDecimal.ZERO)
                .receivedAt(LocalDateTime.now())
                .receivedBy(request.getReceivedBy() != null ? request.getReceivedBy() : 1)
                .createAt(LocalDateTime.now())
                .build();
    }

    private ReceiptBuildResult buildReceiptDetails(GoodsReceipt goodsReceipt, PurchaseOrder po, CreateGoodsReceiptRequest request) {
        List<GoodsReceiptDetail> details = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (var detailRequest : request.getDetails()) {

            if (detailRequest.getPoDetailId() == null) {
                throw new AppException(ErrorCode.VALIDATION_FAILED, "PO Detail ID cannot be null");
            }
            if (detailRequest.getIngredientId() == null) {
                throw new AppException(ErrorCode.VALIDATION_FAILED, "Ingredient ID cannot be null");
            }
            if (detailRequest.getUnitCodeInput() == null || detailRequest.getUnitCodeInput().trim().isEmpty()) {
                throw new AppException(ErrorCode.VALIDATION_FAILED, "Unit Code Input cannot be null or empty");
            }

            PurchaseOrderDetail poDetail = purchaseOrderDetailRepository.findById(detailRequest.getPoDetailId())
                    .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND, "Purchase Order Detail not found"));

            Ingredient ingredient = ingredientRepository.findById(detailRequest.getIngredientId())
                    .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND, "Ingredient not found"));

            unitRepository.findById(detailRequest.getUnitCodeInput())
                    .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND, "Unit not found"));

            BigDecimal conversionFactor = unitConversionService.getConversionFactor(
                    ingredient.getIngredientId(),
                    detailRequest.getUnitCodeInput(),
                    ingredient.getUnit().getCode(),
                    request.getBranchId()
            );


            // Calculate remaining quantity for this PO detail
            BigDecimal totalReceivedQty = getTotalReceivedQuantityForPoDetail(poDetail.getId());
            BigDecimal remainingQty = poDetail.getQty().subtract(totalReceivedQty);
            
            log.info("PO Detail ID: {}, Ordered Qty: {}, Total Received: {}, Remaining: {}", 
                    poDetail.getId(), poDetail.getQty(), totalReceivedQty, remainingQty);

            // Auto-detect status if not provided
            String status = determineReceiptStatus(detailRequest, remainingQty, conversionFactor);
            BigDecimal damageQty = detailRequest.getDamageQty() != null ? detailRequest.getDamageQty() : BigDecimal.ZERO;
            
            // Validate quantities based on status
            validateReceiptQuantities(detailRequest, remainingQty, status);

            BigDecimal qtyBase = detailRequest.getQtyInput().multiply(conversionFactor);
            BigDecimal lineTotal = qtyBase.multiply(detailRequest.getUnitPrice());
            totalAmount = totalAmount.add(lineTotal);

            GoodsReceiptDetail detail = GoodsReceiptDetail.builder()
                    .goodsReceipt(goodsReceipt)
                    .purchaseOrder(po)
                    .purchaseOrderDetail(poDetail)
                    .ingredient(ingredient)
                    .unitCodeInput(detailRequest.getUnitCodeInput())
                    .qtyInput(detailRequest.getQtyInput())
                    .conversionFactor(conversionFactor)
                    .qtyBase(qtyBase)
                    .unitPrice(detailRequest.getUnitPrice())
                    .lineTotal(lineTotal)
                    .lotNumber(detailRequest.getLotNumber())
                    .mfgDate(detailRequest.getMfgDate())
                    .expDate(detailRequest.getExpDate())
                    .status(status)
                    .damageQty(damageQty)
                    .note(detailRequest.getNote())
                    .createAt(LocalDateTime.now())
                    .build();

            details.add(detail);
        }

        return new ReceiptBuildResult(details, totalAmount);
    }

    private void createInventoryAndCostForDetails(GoodsReceipt savedGRN, List<GoodsReceiptDetail> details, Integer branchId, PurchaseOrder po) {
        for (GoodsReceiptDetail detail : details) {
            Integer ingredientId = detail.getIngredient().getIngredientId();

            Stock stock = stockRepository
                    .findByBranchIdAndIngredientIngredientId(branchId, ingredientId)
                    .orElse(Stock.builder()
                            .ingredient(detail.getIngredient())
                            .branchId(branchId)
                            .quantity(BigDecimal.ZERO)
                            .threshold(BigDecimal.ZERO)
                            .unit(detail.getIngredient().getUnit())
                            .lastUpdated(LocalDateTime.now())
                            .build());

            BigDecimal beforeQty = stock.getQuantity() != null ? stock.getQuantity() : BigDecimal.ZERO;
            
        // Determine quantity to add to inventory based on detailed status
        BigDecimal qtyIn;
        String status = detail.getStatus();
        
        if (status != null) {
            switch (status) {
                case ReceiptStatusConstants.DAMAGE_ACCEPTED:
                    // Accept damaged items - qtyBase already includes total quantity (good + damaged)
                    qtyIn = detail.getQtyBase();
                    break;
                    
                case ReceiptStatusConstants.DAMAGE_RETURN:
                    // FE sends qtyBase as GOOD quantity for DAMAGE_RETURN → add good qty as-is
                    qtyIn = detail.getQtyBase();
                    break;
                    
                case ReceiptStatusConstants.DAMAGE_PARTIAL:
                    // FE sends qtyBase as GOOD quantity for DAMAGE_PARTIAL → add good qty as-is
                    qtyIn = detail.getQtyBase();
                    break;
                    
                case ReceiptStatusConstants.SHORT_ACCEPTED:
                case ReceiptStatusConstants.SHORT_PENDING:
                    // Shortage cases - only received quantity goes to inventory
                    qtyIn = detail.getQtyBase();
                    break;
                    
                case ReceiptStatusConstants.OVER_ACCEPTED:
                case ReceiptStatusConstants.OVER_ADJUSTED:
                    // Overage cases - full quantity goes to inventory
                    qtyIn = detail.getQtyBase();
                    break;
                    
                case ReceiptStatusConstants.OVER_RETURN:
                    // Return excess - only up to remaining quantity should go to inventory
                    // Note: details are already persisted, so total received includes current row.
                    // We must subtract current qty to get the previous total.
                    BigDecimal orderedQtyBase = detail.getPurchaseOrderDetail().getQty();
                    BigDecimal totalReceivedIncludingCurrent = getTotalReceivedQuantityForPoDetail(detail.getPurchaseOrderDetail().getId());
                    BigDecimal totalPrevReceivedBase = totalReceivedIncludingCurrent.subtract(detail.getQtyBase());
                    BigDecimal remainingBase = orderedQtyBase.subtract(totalPrevReceivedBase);
                    if (remainingBase.compareTo(BigDecimal.ZERO) < 0) {
                        remainingBase = BigDecimal.ZERO;
                    }
                    // Cap qtyIn to remainingBase
                    qtyIn = remainingBase.min(detail.getQtyBase());
                    break;
                    
                case ReceiptStatusConstants.OK:
                default:
                    // Normal case - full quantity goes to inventory
                    qtyIn = detail.getQtyBase();
                    break;
            }
        } else {
            // Fallback to good quantity only
            qtyIn = detail.getQtyBase();
        }
            
            BigDecimal qtyOut = BigDecimal.ZERO;
            BigDecimal afterQty = beforeQty.add(qtyIn).subtract(qtyOut);

            InventoryTransaction transaction = InventoryTransaction.builder()
                    .branchId(branchId)
                    .ingredient(detail.getIngredient())
                    .txnType("RECEIPT")
                    .qtyIn(qtyIn)
                    .qtyOut(qtyOut)
                    .unit(detail.getIngredient().getUnit())
                    .unitPrice(detail.getUnitPrice())
                    .lineTotal(detail.getLineTotal())
                    .refType("PURCHASE_ORDER")
                    .refId(String.valueOf(po.getPoId()))
                    .refDetail(detail)
                    .beforeQty(beforeQty)
                    .afterQty(afterQty)
                    .conversionFactor(detail.getConversionFactor())
                    .note(buildInventoryTransactionNote(detail))
                    .createAt(LocalDateTime.now())
                    .build();

            inventoryTransactionRepository.save(transaction);

            stock.setQuantity(afterQty);
            stock.setLastUpdated(LocalDateTime.now());
            stock.setUnit(detail.getIngredient().getUnit());
            stockRepository.save(stock);
            inventoryAlertService.evaluateAndPublish(stock);

            InventoryCostId costId = new InventoryCostId();
            costId.setBranchId(branchId);
            costId.setIngredientId(ingredientId);

            InventoryCost invCost = inventoryCostRepository.findById(costId)
                    .orElse(InventoryCost.builder()
                            .id(costId)
                            .stock(stock)
                            .avgCost(BigDecimal.ZERO)
                            .updatedAt(LocalDateTime.now())
                            .build());

            BigDecimal oldQty = beforeQty;
            BigDecimal oldAvg = invCost.getAvgCost() != null ? invCost.getAvgCost() : BigDecimal.ZERO;
            BigDecimal newQty = qtyIn;
            BigDecimal newPrice = detail.getUnitPrice();

            BigDecimal totalQty = oldQty.add(newQty);
            BigDecimal totalValue = oldQty.multiply(oldAvg).add(newQty.multiply(newPrice));
            BigDecimal newAvg = totalQty.compareTo(BigDecimal.ZERO) == 0
                    ? BigDecimal.ZERO
                    : totalValue.divide(totalQty, 4, java.math.RoundingMode.HALF_UP);

            invCost.setAvgCost(newAvg);
            invCost.setUpdatedAt(LocalDateTime.now());
            invCost.setStock(stock);
            inventoryCostRepository.save(invCost);

            log.info("Inventory updated - ingredientId: {}, branchId: {}, beforeQty: {}, qtyIn: {}, qtyOut: {}, afterQty: {}",
                    ingredientId, branchId, beforeQty, qtyIn, qtyOut, afterQty);
        }
    }

    /**
     * Build inventory transaction note with status and damage info
     */
    private String buildInventoryTransactionNote(GoodsReceiptDetail detail) {
        StringBuilder note = new StringBuilder("Goods receipt");
        
        if (detail.getStatus() != null) {
            note.append(" (").append(detail.getStatus()).append(")");
        }
        
        if (detail.getDamageQty() != null && detail.getDamageQty().compareTo(BigDecimal.ZERO) > 0) {
            if ("DAMAGE".equals(detail.getStatus())) {
                // For damage status, show that damaged items are included in inventory
                note.append(" - Including damaged items: ").append(detail.getDamageQty());
            } else {
                // For other statuses, just show damage info
                note.append(" - Damage: ").append(detail.getDamageQty());
            }
        }
        
        if (detail.getNote() != null && !detail.getNote().trim().isEmpty()) {
            note.append(" - ").append(detail.getNote());
        }
        
        return note.toString();
    }

    /**
     * Get receipt status for all PO details in a purchase order
     */
    public List<PoDetailReceiptStatus> getPoDetailReceiptStatuses(Integer poId) {
        List<PoDetailReceiptStatus> statuses = new ArrayList<>();
        
        // Get all PO details for this PO
        List<PurchaseOrderDetail> poDetails = purchaseOrderDetailRepository.findByPurchaseOrderPoId(poId);
        
        // Check each PO detail individually to see if it has been received
        for (PurchaseOrderDetail poDetail : poDetails) {
            // Check if this specific PO detail has any receipt records
            List<GoodsReceiptDetail> receiptDetails = goodsReceiptDetailRepository.findByPurchaseOrderDetailId(poDetail.getId());
            
            // Only include in response if this PO detail has been received (has receipt records)
            if (!receiptDetails.isEmpty()) {
                PoDetailReceiptStatus status = calculatePoDetailReceiptStatus(poDetail);
                statuses.add(status);
            }
        }
        
        return statuses;
    }
    
    /**
     * Calculate receipt status for a specific PO detail
     */
    private PoDetailReceiptStatus calculatePoDetailReceiptStatus(PurchaseOrderDetail poDetail) {
        Integer poDetailId = poDetail.getId();
        BigDecimal orderedQty = poDetail.getQty();
        
        // Get all goods receipt details for this PO detail
        List<GoodsReceiptDetail> receiptDetails = goodsReceiptDetailRepository.findByPurchaseOrderDetailId(poDetailId);
        
        // Calculate total received quantity
        BigDecimal totalReceivedQty = BigDecimal.ZERO;
        BigDecimal totalDamageQty = BigDecimal.ZERO;
        
        for (GoodsReceiptDetail receiptDetail : receiptDetails) {
            // Add to total received quantity
            totalReceivedQty = totalReceivedQty.add(receiptDetail.getQtyInput());
            
            // Add damage quantity if any
            if (receiptDetail.getDamageQty() != null) {
                totalDamageQty = totalDamageQty.add(receiptDetail.getDamageQty());
            }
        }
        
        // Calculate remaining quantity
        BigDecimal remainingQty = orderedQty.subtract(totalReceivedQty);
        
        // Determine status and check if more receipts are allowed
        String status;
        boolean canReceiveMore = true;
        String lastReceiptStatus = null;
        
        if (totalReceivedQty.compareTo(orderedQty) >= 0) {
            status = "FULLY_RECEIVED";
            canReceiveMore = false;
        } else if (totalReceivedQty.compareTo(BigDecimal.ZERO) > 0) {
            status = "PARTIALLY_RECEIVED";
            
            // Check the status of the last receipt to determine if more receipts are allowed
            if (!receiptDetails.isEmpty()) {
                GoodsReceiptDetail lastReceipt = receiptDetails.get(receiptDetails.size() - 1);
                lastReceiptStatus = lastReceipt.getStatus();
                
                // If last receipt was SHORT_PENDING, OVER_RETURN, or DAMAGE_RETURN, can receive more
                // If last receipt was SHORT_ACCEPTED, OVER_ACCEPTED, or DAMAGE_ACCEPTED, cannot receive more
                if (ReceiptStatusConstants.SHORT_ACCEPTED.equals(lastReceiptStatus) || 
                    ReceiptStatusConstants.OVER_ACCEPTED.equals(lastReceiptStatus) || 
                    ReceiptStatusConstants.DAMAGE_ACCEPTED.equals(lastReceiptStatus)) {
                    canReceiveMore = false;
                }
            }
        } else {
            status = "NOT_RECEIVED";
        }
        
        // Generate human-readable message
        String receiptMessage = generateReceiptMessage(status, totalReceivedQty, orderedQty, remainingQty, 
                                                      canReceiveMore, lastReceiptStatus);
        
        return PoDetailReceiptStatus.builder()
                .poDetailId(poDetailId)
                .ingredientId(poDetail.getIngredient().getIngredientId())
                .ingredientName(poDetail.getIngredient().getName())
                .orderedQty(orderedQty)
                .receivedQty(totalReceivedQty)
                .damageQty(totalDamageQty)
                .remainingQty(remainingQty)
                .status(status)
                .unitCode(poDetail.getUnit().getCode())
                .canReceiveMore(canReceiveMore)
                .lastReceiptStatus(lastReceiptStatus)
                .receiptMessage(receiptMessage)
                .build();
    }
    
    /**
     * Generate human-readable message for receipt status
     */
    private String generateReceiptMessage(String status, BigDecimal receivedQty, BigDecimal orderedQty, 
                                        BigDecimal remainingQty, boolean canReceiveMore, String lastReceiptStatus) {
        StringBuilder message = new StringBuilder();
        
        switch (status) {
            case "FULLY_RECEIVED":
                message.append("Fully received (").append(receivedQty).append("/").append(orderedQty).append(")");
                break;
                
            case "PARTIALLY_RECEIVED":
                message.append("Partially received (").append(receivedQty).append("/").append(orderedQty).append(")");
                message.append(" - ").append(remainingQty).append(" remaining");
                
                if (canReceiveMore) {
                    message.append(" - Can receive more");
                } else {
                    message.append(" - Cannot receive more");
                    if (lastReceiptStatus != null) {
                        switch (lastReceiptStatus) {
                            case ReceiptStatusConstants.SHORT_ACCEPTED:
                                message.append(" (shortage accepted)");
                                break;
                            case ReceiptStatusConstants.OVER_ACCEPTED:
                                message.append(" (overage accepted)");
                                break;
                            case ReceiptStatusConstants.DAMAGE_ACCEPTED:
                                message.append(" (damage accepted)");
                                break;
                        }
                    }
                }
                break;
                
            case "NOT_RECEIVED":
                message.append("❌ Not received (0/").append(orderedQty).append(")");
                break;
        }
        
        return message.toString();
    }
    
    /**
     * Get total received quantity for a specific PO detail
     */
    private BigDecimal getTotalReceivedQuantityForPoDetail(Integer poDetailId) {
        List<GoodsReceiptDetail> existingReceipts = goodsReceiptDetailRepository.findByPurchaseOrderDetailId(poDetailId);
        return existingReceipts.stream()
                .map(GoodsReceiptDetail::getQtyBase)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Auto-detect receipt status based on quantities
     */
    private String determineReceiptStatus(com.service.catalog.dto.request.goodsReceipt.GoodsReceiptDetailRequest detailRequest, 
                                         BigDecimal remainingQty, BigDecimal conversionFactor) {
        // If status is explicitly provided, use it
        if (detailRequest.getStatus() != null && !detailRequest.getStatus().trim().isEmpty()) {
            return detailRequest.getStatus();
        }

        BigDecimal qtyInputBase = detailRequest.getQtyInput().multiply(conversionFactor);
        BigDecimal damageQty = detailRequest.getDamageQty() != null ? detailRequest.getDamageQty() : BigDecimal.ZERO;
        
        // If there's damage, it's always DAMAGE status
        if (damageQty.compareTo(BigDecimal.ZERO) > 0) {
            return "DAMAGE";
        }
        
        // Compare with remaining quantity
        int comparison = qtyInputBase.compareTo(remainingQty);
        
        if (comparison == 0) {
            return "OK";  // Exact match
        } else if (comparison < 0) {
            return "SHORT";  // Less than remaining
        } else {
            return "OVER";   // More than remaining
        }
    }

    /**
     * Validate receipt quantities based on status
     */
    private void validateReceiptQuantities(com.service.catalog.dto.request.goodsReceipt.GoodsReceiptDetailRequest detailRequest, 
                                          BigDecimal remainingQty, String status) {
        BigDecimal qtyInput = detailRequest.getQtyInput();
        BigDecimal damageQty = detailRequest.getDamageQty() != null ? detailRequest.getDamageQty() : BigDecimal.ZERO;
        
        // Basic validations
        if (qtyInput.compareTo(BigDecimal.ZERO) <= 0) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, "Quantity input must be greater than 0");
        }
        
        if (damageQty.compareTo(BigDecimal.ZERO) < 0) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, "Damage quantity cannot be negative");
        }
        
        // Status-specific validations
        switch (status) {
            case "OK":
                // For OK, quantity should match remaining exactly (with small tolerance)
                BigDecimal tolerance = remainingQty.multiply(new BigDecimal("0.01")); // 1% tolerance
                if (qtyInput.subtract(remainingQty).abs().compareTo(tolerance) > 0) {
                    log.warn("OK status but quantity doesn't match remaining exactly. Input: {}, Remaining: {}", 
                            qtyInput, remainingQty);
                }
                break;
                
            case "SHORT":
                // For SHORT, quantity should be less than remaining
                if (qtyInput.compareTo(remainingQty) >= 0) {
                    throw new AppException(ErrorCode.VALIDATION_FAILED, 
                            "SHORT status requires quantity less than remaining. Input: " + qtyInput + 
                            ", Remaining: " + remainingQty);
                }
                break;
                
            case "OVER":
                // For OVER, quantity should be more than remaining
                if (qtyInput.compareTo(remainingQty) <= 0) {
                    throw new AppException(ErrorCode.VALIDATION_FAILED, 
                            "OVER status requires quantity more than remaining. Input: " + qtyInput + 
                            ", Remaining: " + remainingQty);
                }
                break;
                
            case "DAMAGE":
                // For DAMAGE, damage quantity should be > 0
                if (damageQty.compareTo(BigDecimal.ZERO) <= 0) {
                    throw new AppException(ErrorCode.VALIDATION_FAILED, 
                            "DAMAGE status requires damage quantity > 0");
                }
                // Total quantity (input + damage) should not exceed remaining significantly
                BigDecimal totalQty = qtyInput.add(damageQty);
                if (totalQty.compareTo(remainingQty.multiply(new BigDecimal("1.1"))) > 0) {
                    log.warn("DAMAGE: Total quantity (input + damage) significantly exceeds remaining. " +
                            "Total: {}, Remaining: {}", totalQty, remainingQty);
                }
                break;
        }
    }

    private static class ReceiptBuildResult {
        final List<GoodsReceiptDetail> details;
        final BigDecimal totalAmount;

        ReceiptBuildResult(List<GoodsReceiptDetail> details, BigDecimal totalAmount) {
            this.details = details;
            this.totalAmount = totalAmount;
        }
    }
}
