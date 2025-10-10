package com.service.catalog.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import com.service.catalog.exception.AppException;
import com.service.catalog.exception.ErrorCode;

import com.service.catalog.repository.PurchaseOrderRepository;
import com.service.catalog.repository.PoOutboxLogRepository;
import com.service.catalog.repository.PurchaseOrderStatusHistoryRepository;

import jakarta.transaction.Transactional;

import com.service.catalog.dto.request.purchaseOrder.PurchaseOrderResquest;
import com.service.catalog.dto.request.purchaseOrder.PurchaseOrderDetailRequest;
import com.service.catalog.dto.request.purchaseOrder.PurchaseOrderDetailUpdateRequest;
import com.service.catalog.dto.request.purchaseOrder.SendToSupplierRequest;
import com.service.catalog.dto.request.purchaseOrder.SupplierResponseRequest;
import com.service.catalog.dto.response.PurchaseOrderResponse;
import com.service.catalog.dto.EmailResult;
import com.service.catalog.entity.PoOutboxLog;
import com.service.catalog.entity.PurchaseOrderStatusHistory;
import com.service.catalog.entity.PurchaseOrder;
import com.service.catalog.entity.PurchaseOrderDetail;
import com.service.catalog.entity.Supplier;
import com.service.catalog.entity.Ingredient;
import com.service.catalog.entity.Unit;
import com.service.catalog.mapper.PurchaseOrderMapper;
import com.service.catalog.repository.PurchaseOrderDetailRepository;
import com.service.catalog.repository.SupplierRepository;
import com.service.catalog.repository.IngredientRepository;
import com.service.catalog.repository.UnitRepository;

import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class PurchaseOrderService {

    PurchaseOrderRepository purchaseOrderRepository;
    PurchaseOrderDetailRepository purchaseOrderDetailRepository;
    PurchaseOrderMapper purchaseOrderMapper;
    SupplierRepository supplierRepository;
    IngredientRepository ingredientRepository;
    UnitRepository unitRepository;
    PoOutboxLogRepository poOutboxLogRepository;
    PurchaseOrderStatusHistoryRepository statusHistoryRepository;
    EmailService emailService;
    PDFService pdfService;

    @PreAuthorize("hasRole('MANAGER')")
    public List<PurchaseOrderResponse> getPurchaseOrders(Integer branchId) {
        List<PurchaseOrder> purchaseOrders = purchaseOrderRepository.findByBranchId(branchId);
        return purchaseOrders.stream().map(purchaseOrderMapper::toPurchaseOrderResponse).collect(Collectors.toList());
    }

    @PreAuthorize("hasRole('MANAGER')")
    public PurchaseOrderResponse getPurchaseOrder(Integer poId) {
        PurchaseOrder purchaseOrder = purchaseOrderRepository.getReferenceById(poId);
        return purchaseOrderMapper.toPurchaseOrderResponse(purchaseOrder);
    }

    @Transactional
    @PreAuthorize("hasRole('MANAGER')")
    public List<PurchaseOrderResponse> createPurchaseOrder(PurchaseOrderResquest request) {
        // Group items by supplierId
        Map<Integer, List<PurchaseOrderDetailRequest>> grouped = request.getItems().stream()
                .collect(Collectors.groupingBy(PurchaseOrderDetailRequest::getSupplierId));

        List<PurchaseOrderResponse> responses = new ArrayList<>();

        for (Map.Entry<Integer, List<PurchaseOrderDetailRequest>> entry : grouped.entrySet()) {
            Integer supplierId = entry.getKey();
            Supplier supplier = supplierRepository.getReferenceById(supplierId);

            PurchaseOrder po = new PurchaseOrder();
            po.setPoNumber("PO-" + System.currentTimeMillis());
            po.setSupplier(supplier);
            po.setBranchId(request.getBranchId());
            po.setStatus("DRAFT");
            po.setCreateAt(LocalDateTime.now());
            po.setUpdateAt(LocalDateTime.now());
            // Ensure NOT NULL DB columns have defaults

            BigDecimal total = BigDecimal.ZERO;
            List<PurchaseOrderDetail> podList = new ArrayList<>();

            for (PurchaseOrderDetailRequest d : entry.getValue()) {
                Ingredient ing = ingredientRepository.getReferenceById(d.getIngredientId());
                Unit unit = unitRepository.getReferenceById(d.getUnitCode());

                PurchaseOrderDetail pod = new PurchaseOrderDetail();
                pod.setPurchaseOrder(po);
                pod.setIngredient(ing);
                pod.setUnit(unit);
                pod.setQty(d.getQty());
                pod.setUnitPrice(d.getUnitPrice());
                BigDecimal line = d.getUnitPrice().multiply(d.getQty());
                pod.setLineTotal(line);
                pod.setCreateAt(LocalDateTime.now());
                pod.setUpdateAt(LocalDateTime.now());
                podList.add(pod);
                total = total.add(line);
            }

            po.setTotalAmount(total);
            po.setDetails(podList);
            purchaseOrderRepository.save(po);

            responses.add(purchaseOrderMapper.toPurchaseOrderResponse(po));
        }

        return responses;
    }

    @Transactional
    @PreAuthorize("hasRole('MANAGER')")
    public PurchaseOrderResponse updateStatus(Integer poId, String newStatus) {
        PurchaseOrder po = purchaseOrderRepository.findById(poId)
                .orElseThrow(() -> new RuntimeException("Purchase Order not found with ID: " + poId));

        String currentStatus = po.getStatus();
        
        // Validate status transition
        if (!isValidStatusTransition(currentStatus, newStatus)) {
            throw new RuntimeException("Invalid status transition from " + currentStatus + " to " + newStatus);
        }

        po.setStatus(newStatus);
        po.setUpdateAt(LocalDateTime.now());
        purchaseOrderRepository.save(po);

        return purchaseOrderMapper.toPurchaseOrderResponse(po);
    }


    private boolean isValidStatusTransition(String currentStatus, String newStatus) {
        switch (currentStatus) {
            case "DRAFT":
                return "APPROVED".equals(newStatus) || "CANCELLED".equals(newStatus);
            case "APPROVED":
                return "SENT_TO_SUPPLIER".equals(newStatus) || "CANCELLED".equals(newStatus);
            case "SENT_TO_SUPPLIER":
                return "SUPPLIER_CONFIRMED".equals(newStatus) || "SUPPLIER_CANCELLED".equals(newStatus) || "CANCELLED".equals(newStatus);
            case "SUPPLIER_CONFIRMED":
                // Once supplier confirmed, cannot be cancelled by manager
                return "PARTIALLY_RECEIVED".equals(newStatus) || "RECEIVED".equals(newStatus);
            case "PARTIALLY_RECEIVED":
                // Once partially received, cannot be cancelled
                return "RECEIVED".equals(newStatus) || "RETURN_TO_SUPPLIER".equals(newStatus);
            case "RECEIVED":
                return "CLOSED".equals(newStatus) || "RETURN_TO_SUPPLIER".equals(newStatus);
            case "RETURN_TO_SUPPLIER":
                return "CLOSED".equals(newStatus);
            case "SUPPLIER_CANCELLED":
            case "CANCELLED":
            case "CLOSED":
                return false; // Terminal states
            default:
                return false;
        }
    }

    /**
     * Check if a Purchase Order can be cancelled
     * @param poId Purchase Order ID
     * @return true if can be cancelled, false otherwise
     */
    public boolean canBeCancelled(Integer poId) {
        PurchaseOrder po = purchaseOrderRepository.findById(poId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND, "Purchase Order not found with ID: " + poId));
        
        String status = po.getStatus();
        return "DRAFT".equals(status) || "APPROVED".equals(status) || "SENT_TO_SUPPLIER".equals(status);
    }

    /**
     * Get cancellation reason based on current status
     * @param poId Purchase Order ID
     * @return reason why PO cannot be cancelled, or null if it can be cancelled
     */
    public String getCancellationRestriction(Integer poId) {
        PurchaseOrder po = purchaseOrderRepository.findById(poId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND, "Purchase Order not found with ID: " + poId));
        
        String status = po.getStatus();
        switch (status) {
            case "SUPPLIER_CONFIRMED":
                return "Cannot cancel: Supplier has already confirmed this order";
            case "PARTIALLY_RECEIVED":
                return "Cannot cancel: Order has been partially received";
            case "RECEIVED":
                return "Cannot cancel: Order has been fully received";
            case "CLOSED":
                return "Cannot cancel: Order is already closed";
            case "SUPPLIER_CANCELLED":
                return "Cannot cancel: Order has been cancelled by supplier";
            case "CANCELLED":
                return "Cannot cancel: Order is already cancelled";
            default:
                return null; // Can be cancelled
        }
    }

    // saveDraft removed; use createPurchaseOrder with initialStatus instead

    @Transactional
    @PreAuthorize("hasRole('MANAGER')")
    public void deletePurchaseOrder(Integer poId) {
        PurchaseOrder po = purchaseOrderRepository.findById(poId)
                .orElseThrow(() -> new RuntimeException("Purchase Order not found with ID: " + poId));
        
        // Only allow deletion for CREATED or CANCELLED status
        if (!po.getStatus().equals("CREATED") && !po.getStatus().equals("CANCELLED")) {
            throw new RuntimeException("Cannot delete Purchase Order with status: " + po.getStatus() + 
                    ". Only CREATED or CANCELLED orders can be deleted.");
        }
        
        // Delete the purchase order (cascade will handle PurchaseOrderDetail deletion)
        purchaseOrderRepository.delete(po);
    }

    @Transactional
    @PreAuthorize("hasRole('MANAGER')")
    public void deletePurchaseOrderDetail(Integer detailId) {
        PurchaseOrderDetail detail = purchaseOrderDetailRepository.findById(detailId)
                .orElseThrow(() -> new RuntimeException("Purchase Order Detail not found with ID: " + detailId));
        
        PurchaseOrder po = detail.getPurchaseOrder();
        
        // Only allow deletion if the purchase order is in CREATED status
        if (!po.getStatus().equals("CREATED")) {
            throw new RuntimeException("Cannot delete Purchase Order Detail. Purchase Order status is: " + 
                    po.getStatus() + ". Only items in CREATED orders can be deleted.");
        }
        
        // Delete the detail item
        purchaseOrderDetailRepository.delete(detail);
        
        // Recalculate total amount for the purchase order
        recalculatePurchaseOrderTotal(po.getPoId());
    }

    @Transactional
    @PreAuthorize("hasRole('MANAGER')")
    public void recalculatePurchaseOrderTotal(Integer poId) {
        PurchaseOrder po = purchaseOrderRepository.findById(poId)
                .orElseThrow(() -> new RuntimeException("Purchase Order not found with ID: " + poId));
        
        BigDecimal newTotal = po.getDetails().stream()
                .map(PurchaseOrderDetail::getLineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        po.setTotalAmount(newTotal);
        po.setUpdateAt(LocalDateTime.now());
        purchaseOrderRepository.save(po);
    }

    @Transactional
    @PreAuthorize("hasRole('MANAGER')")
    public PurchaseOrderResponse updatePurchaseOrderDetail(Integer detailId, PurchaseOrderDetailUpdateRequest request) {
        PurchaseOrderDetail detail = purchaseOrderDetailRepository.findById(detailId)
                .orElseThrow(() -> new RuntimeException("Purchase Order Detail not found with ID: " + detailId));
        
        PurchaseOrder po = detail.getPurchaseOrder();
        
        // Only allow update if the purchase order is in DRAFT or CREATED status
        if (!po.getStatus().equals("DRAFT")) {
            throw new RuntimeException("Cannot update Purchase Order Detail. Purchase Order status is: " + 
                    po.getStatus() + ". Only items in DRAFT orders can be updated.");
        }
        
        // Update ingredient if provided
        if (request.getIngredientId() != null) {
            Ingredient ingredient = ingredientRepository.findById(request.getIngredientId())
                    .orElseThrow(() -> new RuntimeException("Ingredient not found with ID: " + request.getIngredientId()));
            detail.setIngredient(ingredient);
        }
        
        // Update unit if provided
        if (request.getUnitCode() != null) {
            Unit unit = unitRepository.findById(request.getUnitCode())
                    .orElseThrow(() -> new RuntimeException("Unit not found with code: " + request.getUnitCode()));
            detail.setUnit(unit);
        }
        
        // Update quantity if provided
        if (request.getQty() != null) {
            detail.setQty(request.getQty());
        }
        
        // Update unit price if provided
        if (request.getUnitPrice() != null) {
            detail.setUnitPrice(request.getUnitPrice());
        }
        
        // Recalculate line total
        BigDecimal lineTotal = detail.getUnitPrice().multiply(detail.getQty());
        detail.setLineTotal(lineTotal);
        detail.setUpdateAt(LocalDateTime.now());
        
        // Save the updated detail
        purchaseOrderDetailRepository.save(detail);
        
        // Recalculate total amount for the purchase order
        recalculatePurchaseOrderTotal(po.getPoId());
        
        // Return the updated Purchase Order
        return purchaseOrderMapper.toPurchaseOrderResponse(po);
    }

    @Transactional
    @PreAuthorize("hasRole('MANAGER')")
    public PurchaseOrderResponse sendToSupplier(Integer poId, SendToSupplierRequest request) {
        // 1. Validate PO status
        PurchaseOrder po = purchaseOrderRepository.findById(poId)
                .orElseThrow(() -> new RuntimeException("Purchase Order not found with ID: " + poId));

        if (!po.getStatus().equals("APPROVED")) {
            throw new RuntimeException("Only APPROVED Purchase Orders can be sent to supplier. Current status: " + po.getStatus());
        }

        EmailResult emailResult;
        try {
            // 2. Send email to supplier
            emailResult = emailService.sendPOToSupplier(po, request.getToEmail(), 
                    request.getCc(), request.getSubject(), request.getMessage());
        } catch (Exception e) {
            log.error("Failed to send email: {}", e.getMessage());
            emailResult = EmailResult.failure(e.getMessage());
        }

        // 3. Log to po_outbox_logs (always save, even if email failed)
        PoOutboxLog outboxLog = PoOutboxLog.builder()
                .purchaseOrder(po)
                .toEmail(request.getToEmail())
                .cc(request.getCc())
                .subject(request.getSubject() != null ? request.getSubject() : "Purchase Order: " + po.getPoNumber())
                .sentAt(LocalDateTime.now())
                .status(emailResult.isSuccess() ? "SENT" : "FAILED")
                .messageId(emailResult.getMessageId())
                .error(emailResult.getError())
                .createAt(LocalDateTime.now())
                .build();
        poOutboxLogRepository.save(outboxLog);

        // 4. Update PO status and sent_at (only if email was successful)
        if (emailResult.isSuccess()) {
            po.setStatus("SENT_TO_SUPPLIER");
            po.setSentAt(LocalDateTime.now());
            po.setUpdateAt(LocalDateTime.now());
            purchaseOrderRepository.save(po);

            // 5. Record status history
            recordStatusHistory(po, "APPROVED", "SENT_TO_SUPPLIER", "Sent to supplier via email");
        }

        return purchaseOrderMapper.toPurchaseOrderResponse(po);
    }


    private boolean isValidSupplierResponseStatus(String status) {
        return "SUPPLIER_CONFIRMED".equals(status) || "SUPPLIER_CANCELLED".equals(status);
    }

    // Public methods for supplier response (no authentication required)
    public PurchaseOrderResponse getPurchaseOrderForSupplier(Integer poId) {
        PurchaseOrder po = purchaseOrderRepository.findById(poId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND, "Purchase Order not found with ID: " + poId));

        String status = po.getStatus();
        if (!"SENT_TO_SUPPLIER".equals(status) && 
            !"SUPPLIER_CONFIRMED".equals(status) && 
            !"SUPPLIER_CANCELLED".equals(status)) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, "Purchase Order is not available for supplier response. Current status: " + status);
        }

        return purchaseOrderMapper.toPurchaseOrderResponse(po);
    }

    @Transactional
    public PurchaseOrderResponse updateSupplierResponsePublic(Integer poId, SupplierResponseRequest request) {
        // Same logic as updateSupplierResponse but without @PreAuthorize
        PurchaseOrder po = purchaseOrderRepository.findById(poId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND, "Purchase Order not found with ID: " + poId));

        if (!po.getStatus().equals("SENT_TO_SUPPLIER")) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, "Only SENT_TO_SUPPLIER Purchase Orders can be updated with supplier response. Current status: " + po.getStatus());
        }

        if (!isValidSupplierResponseStatus(request.getStatus())) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, "Invalid supplier response status: " + request.getStatus() + ". Must be SUPPLIER_CONFIRMED or SUPPLIER_CANCELLED");
        }

        String fromStatus = po.getStatus();
        po.setStatus(request.getStatus());
        po.setConfirmedAt(LocalDateTime.now());
        po.setUpdateAt(LocalDateTime.now());

        if ("SUPPLIER_CONFIRMED".equals(request.getStatus())) {
            if (request.getExpectedDeliveryAt() != null) {
                po.setExpectedDeliveryAt(request.getExpectedDeliveryAt());
            }
            // Shipping cost is no longer required - keep existing value or set to 0
        }

        if (request.getSupplierResponse() != null && !request.getSupplierResponse().trim().isEmpty()) {
            po.setSupplierResponse(request.getSupplierResponse());
        }

        purchaseOrderRepository.save(po);

        String note = "SUPPLIER_CONFIRMED".equals(request.getStatus()) ? 
            "Supplier confirmed order" : "Supplier cancelled order";
        if (request.getSupplierResponse() != null && !request.getSupplierResponse().trim().isEmpty()) {
            note += ": " + request.getSupplierResponse();
        }
        recordStatusHistory(po, fromStatus, request.getStatus(), note);

        return purchaseOrderMapper.toPurchaseOrderResponse(po);
    }

    @Transactional
    public void cancelPurchaseOrderBySupplier(Integer poId, String reason) {
        PurchaseOrder po = purchaseOrderRepository.findById(poId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND, "Purchase Order not found with ID: " + poId));

        if (!po.getStatus().equals("SENT_TO_SUPPLIER")) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, "Only SENT_TO_SUPPLIER Purchase Orders can be cancelled by supplier. Current status: " + po.getStatus());
        }

        String fromStatus = po.getStatus();
        po.setStatus("SUPPLIER_CANCELLED");
        po.setConfirmedAt(LocalDateTime.now());
        po.setUpdateAt(LocalDateTime.now());
        po.setSupplierResponse(reason != null && !reason.trim().isEmpty() ? reason : "Cancelled by supplier");

        purchaseOrderRepository.save(po);

        String note = "Cancelled by supplier";
        if (reason != null && !reason.trim().isEmpty()) {
            note += ": " + reason;
        }
        recordStatusHistory(po, fromStatus, "SUPPLIER_CANCELLED", note);
    }

    private void recordStatusHistory(PurchaseOrder po, String fromStatus, String toStatus, String note) {
        PurchaseOrderStatusHistory history = PurchaseOrderStatusHistory.builder()
                .purchaseOrder(po)
                .fromStatus(fromStatus)
                .toStatus(toStatus)
                .changedAt(LocalDateTime.now())
                .changedBy("SYSTEM") // TODO: Get current user
                .note(note)
                .build();
        statusHistoryRepository.save(history);
    }
}
