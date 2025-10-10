package com.service.catalog.service;

import com.service.catalog.dto.request.goodsReceipt.CreateGoodsReceiptRequest;
import com.service.catalog.dto.response.GoodsReceiptResponse;
import com.service.catalog.entity.*;
import com.service.catalog.exception.AppException;
import com.service.catalog.exception.ErrorCode;
import com.service.catalog.mapper.GoodsReceiptMapper;
import com.service.catalog.repository.*;
import com.service.catalog.entity.Stock;
import com.service.catalog.repository.StockRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderDetailRepository purchaseOrderDetailRepository;
    private final SupplierRepository supplierRepository;
    private final IngredientRepository ingredientRepository;
    private final UnitRepository unitRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final StockRepository stockRepository;
    private final InventoryCostRepository inventoryCostRepository;
    private final GoodsReceiptMapper goodsReceiptMapper;
    private final UnitConversionService unitConversionService;
    private final PurchaseOrderStatusHistoryRepository purchaseOrderStatusHistoryRepository;

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
        
        // Check for damage in current receipt
        for (GoodsReceiptDetail detail : details) {
            if ("DAMAGE".equals(detail.getStatus())) {
                hasDamage = true;
            }
        }

        // Update PO status based on receipt results
        String fromStatus = po.getStatus();
        if (allReceived && !hasShortage && !hasDamage) {
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
            log.info("=== DETAIL REQUEST DEBUG ===");
            log.info("detailRequest.getPoDetailId(): {}", detailRequest.getPoDetailId());
            log.info("detailRequest.getIngredientId(): {}", detailRequest.getIngredientId());
            log.info("detailRequest.getUnitCodeInput(): {}", detailRequest.getUnitCodeInput());

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

            log.info("Conversion factor found: {}", conversionFactor);

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
                    .status(detailRequest.getStatus())
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
                    .findByIngredientIngredientIdAndBranchId(ingredientId, branchId)
                    .orElse(Stock.builder()
                            .ingredient(detail.getIngredient())
                            .branchId(branchId)
                            .quantity(BigDecimal.ZERO)
                            .threshold(BigDecimal.ZERO)
                            .unit(detail.getIngredient().getUnit())
                            .lastUpdated(LocalDateTime.now())
                            .build());

            BigDecimal beforeQty = stock.getQuantity() != null ? stock.getQuantity() : BigDecimal.ZERO;
            BigDecimal qtyIn = detail.getQtyBase();
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
                    .note("Goods receipt: " + (detail.getNote() != null ? detail.getNote() : ""))
                    .createAt(LocalDateTime.now())
                    .build();

            inventoryTransactionRepository.save(transaction);

            stock.setQuantity(afterQty);
            stock.setLastUpdated(LocalDateTime.now());
            stock.setUnit(detail.getIngredient().getUnit());
            stockRepository.save(stock);

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

    private static class ReceiptBuildResult {
        final List<GoodsReceiptDetail> details;
        final BigDecimal totalAmount;

        ReceiptBuildResult(List<GoodsReceiptDetail> details, BigDecimal totalAmount) {
            this.details = details;
            this.totalAmount = totalAmount;
        }
    }
}
