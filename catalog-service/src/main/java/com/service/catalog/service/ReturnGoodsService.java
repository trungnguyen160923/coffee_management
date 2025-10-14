package com.service.catalog.service;

import com.service.catalog.dto.request.returnGoods.CreateReturnGoodsRequest;
import com.service.catalog.dto.response.ReturnGoodsResponse;
import com.service.catalog.entity.*;
import com.service.catalog.exception.AppException;
import com.service.catalog.exception.ErrorCode;
import com.service.catalog.mapper.ReturnGoodsMapper;
import com.service.catalog.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
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
public class ReturnGoodsService {

    private final ReturnGoodsRepository returnGoodsRepository;
    private final ReturnGoodsDetailRepository returnGoodsDetailRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final SupplierRepository supplierRepository;
    private final IngredientRepository ingredientRepository;
    private final UnitRepository unitRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final ReturnGoodsMapper returnGoodsMapper;

    @Transactional
    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER')")
    public ReturnGoodsResponse createReturnGoods(CreateReturnGoodsRequest request) {
        // Validate PO exists and is in correct status
        PurchaseOrder po = purchaseOrderRepository.findById(request.getPoId())
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND, "Purchase Order not found"));

        if (!"PARTIALLY_RECEIVED".equals(po.getStatus()) && !"RECEIVED".equals(po.getStatus())) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 
                "Cannot create return for PO with status: " + po.getStatus() + ". Only PARTIALLY_RECEIVED or RECEIVED POs can be returned.");
        }

        // Validate supplier
        Supplier supplier = supplierRepository.findById(request.getSupplierId())
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND, "Supplier not found"));

        // Create return goods
        ReturnGoods returnGoods = ReturnGoods.builder()
                .returnNumber(generateReturnNumber())
                .purchaseOrder(po)
                .supplier(supplier)
                .branchId(request.getBranchId())
                .status("PENDING")
                .returnReason(request.getReturnReason())
                .createAt(LocalDateTime.now())
                .updateAt(LocalDateTime.now())
                .build();

        // Create return details
        List<ReturnGoodsDetail> details = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (var detailRequest : request.getDetails()) {
            Ingredient ingredient = ingredientRepository.findById(detailRequest.getIngredientId())
                    .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND, "Ingredient not found"));

            Unit unit = unitRepository.findById(detailRequest.getUnitCode())
                    .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND, "Unit not found"));

            BigDecimal lineTotal = detailRequest.getQty().multiply(detailRequest.getUnitPrice());
            totalAmount = totalAmount.add(lineTotal);

            ReturnGoodsDetail detail = ReturnGoodsDetail.builder()
                    .returnGoods(returnGoods)
                    .ingredient(ingredient)
                    .unit(unit)
                    .qty(detailRequest.getQty())
                    .unitPrice(detailRequest.getUnitPrice())
                    .lineTotal(lineTotal)
                    .returnReason(detailRequest.getReturnReason())
                    .createAt(LocalDateTime.now())
                    .updateAt(LocalDateTime.now())
                    .build();

            details.add(detail);
        }

        returnGoods.setTotalAmount(totalAmount);
        returnGoods.setDetails(details);

        ReturnGoods savedReturn = returnGoodsRepository.save(returnGoods);
        returnGoodsDetailRepository.saveAll(details);

        log.info("Created return goods: {} for PO: {}", savedReturn.getReturnNumber(), po.getPoNumber());
        return returnGoodsMapper.toReturnGoodsResponse(savedReturn);
    }

    @Transactional
    @PreAuthorize("hasRole('MANAGER')")
    public ReturnGoodsResponse approveReturnGoods(Integer returnId) {
        ReturnGoods returnGoods = returnGoodsRepository.findById(returnId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND, "Return Goods not found"));

        if (!"PENDING".equals(returnGoods.getStatus())) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 
                "Cannot approve return with status: " + returnGoods.getStatus());
        }

        returnGoods.setStatus("APPROVED");
        returnGoods.setApprovedAt(LocalDateTime.now());
        returnGoods.setUpdateAt(LocalDateTime.now());

        ReturnGoods savedReturn = returnGoodsRepository.save(returnGoods);
        log.info("Approved return goods: {}", savedReturn.getReturnNumber());
        return returnGoodsMapper.toReturnGoodsResponse(savedReturn);
    }

    @Transactional
    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER')")
    public ReturnGoodsResponse processReturnGoods(Integer returnId) {
        ReturnGoods returnGoods = returnGoodsRepository.findById(returnId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND, "Return Goods not found"));

        if (!"APPROVED".equals(returnGoods.getStatus())) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 
                "Cannot process return with status: " + returnGoods.getStatus());
        }

        // Process inventory transactions for each detail
        for (ReturnGoodsDetail detail : returnGoods.getDetails()) {
            // Create inventory transaction for return
            InventoryTransaction transaction = InventoryTransaction.builder()
                    .branchId(returnGoods.getBranchId())
                    .ingredient(detail.getIngredient())
                    .txnType("RETURN_TO_SUPPLIER")
                    .qtyOut(detail.getQty())
                    .unit(detail.getUnit())
                    .unitPrice(detail.getUnitPrice())
                    .lineTotal(detail.getLineTotal())
                    .refType("RETURN_GOODS")
                    .refId(returnGoods.getReturnNumber())
                    .beforeQty(BigDecimal.ZERO) // Will be calculated based on current stock
                    .afterQty(BigDecimal.ZERO)  // Will be calculated based on current stock
                    .note("Return to supplier: " + detail.getReturnReason())
                    .createAt(LocalDateTime.now())
                    .build();

            inventoryTransactionRepository.save(transaction);
        }

        // Update return status
        returnGoods.setStatus("RETURNED");
        returnGoods.setReturnedAt(LocalDateTime.now());
        returnGoods.setUpdateAt(LocalDateTime.now());

        // Update PO status if all goods are returned
        PurchaseOrder po = returnGoods.getPurchaseOrder();
        if (isFullReturn(returnGoods, po)) {
            po.setStatus("RETURN_TO_SUPPLIER");
            po.setUpdateAt(LocalDateTime.now());
            purchaseOrderRepository.save(po);
        }

        ReturnGoods savedReturn = returnGoodsRepository.save(returnGoods);
        log.info("Processed return goods: {}", savedReturn.getReturnNumber());
        return returnGoodsMapper.toReturnGoodsResponse(savedReturn);
    }

    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER')")
    public List<ReturnGoodsResponse> getReturnGoodsByPo(Integer poId) {
        List<ReturnGoods> returns = returnGoodsRepository.findByPurchaseOrderPoId(poId);
        return returns.stream()
                .map(returnGoodsMapper::toReturnGoodsResponse)
                .toList();
    }

    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER')")
    public List<ReturnGoodsResponse> getReturnGoodsByStatus(String status) {
        List<ReturnGoods> returns = returnGoodsRepository.findByStatus(status);
        return returns.stream()
                .map(returnGoodsMapper::toReturnGoodsResponse)
                .toList();
    }

    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER')")
    public ReturnGoodsResponse getReturnGoodsById(Integer returnId) {
        ReturnGoods entity = returnGoodsRepository.findById(returnId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND, "Return Goods not found"));
        return returnGoodsMapper.toReturnGoodsResponse(entity);
    }

    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER')")
    public Page<ReturnGoodsResponse> searchReturnGoods(Integer poId,
                                                       Integer supplierId,
                                                       Integer branchId,
                                                       String returnNumber,
                                                       String status,
                                                       java.time.LocalDate fromDate,
                                                       java.time.LocalDate toDate,
                                                       Pageable pageable) {
        Specification<ReturnGoods> spec = (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
            if (poId != null) predicates.add(cb.equal(root.get("purchaseOrder").get("poId"), poId));
            if (supplierId != null) predicates.add(cb.equal(root.get("supplier").get("supplierId"), supplierId));
            if (branchId != null) predicates.add(cb.equal(root.get("branchId"), branchId));
            if (returnNumber != null && !returnNumber.isBlank()) predicates.add(cb.like(cb.lower(root.get("returnNumber")), "%" + returnNumber.toLowerCase() + "%"));
            if (status != null && !status.isBlank()) predicates.add(cb.equal(root.get("status"), status));
            if (fromDate != null) predicates.add(cb.greaterThanOrEqualTo(root.get("createAt"), fromDate.atStartOfDay()));
            if (toDate != null) predicates.add(cb.lessThanOrEqualTo(root.get("createAt"), toDate.atTime(23,59,59)));
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
        Page<ReturnGoods> page = returnGoodsRepository.findAll(spec, pageable);
        return page.map(returnGoodsMapper::toReturnGoodsResponse);
    }

    private String generateReturnNumber() {
        return "RTN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private boolean isFullReturn(ReturnGoods returnGoods, PurchaseOrder po) {
        // Check if all received items are being returned
        // This is a simplified check - in real implementation, you'd need to compare
        // with goods receipt details to determine if it's a full return
        return true; // Simplified for now
    }
}
