package com.service.catalog.service;

import java.math.BigDecimal;
import java.time.Instant;

import org.springframework.stereotype.Service;

import com.service.catalog.entity.Ingredient;
import com.service.catalog.entity.Stock;
import com.service.catalog.entity.Unit;
import com.service.catalog.events.LowStockEvent;
import com.service.catalog.events.OutOfStockEvent;
import com.service.catalog.messaging.InventoryEventProducer;
import com.service.catalog.repository.http_client.BranchClient;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryAlertService {

    private final InventoryEventProducer eventProducer;
    private final BranchClient branchClient;

    public void evaluateAndPublish(Stock stock) {
        if (stock == null) {
            return;
        }

        BigDecimal available = safeValue(stock.getAvailableQuantity());
        BigDecimal threshold = safeValue(stock.getThreshold());
        BigDecimal quantity = safeValue(stock.getQuantity());
        BigDecimal reserved = safeValue(stock.getReservedQuantity());

        String branchName = fetchBranchName(stock.getBranchId());

        if (available.compareTo(BigDecimal.ZERO) <= 0) {
            eventProducer.publishOutOfStock(buildOutOfStockEvent(stock, quantity, reserved, available, threshold, branchName));
            return;
        }

        if (threshold.compareTo(BigDecimal.ZERO) > 0 && available.compareTo(threshold) <= 0) {
            eventProducer.publishLowStock(buildLowStockEvent(stock, quantity, reserved, available, threshold, branchName));
        }
    }

    private LowStockEvent buildLowStockEvent(Stock stock,
            BigDecimal quantity,
            BigDecimal reserved,
            BigDecimal available,
            BigDecimal threshold,
            String branchName) {
        return LowStockEvent.builder()
                .branchId(stock.getBranchId())
                .branchName(branchName)
                .ingredientId(getIngredientId(stock))
                .ingredientName(getIngredientName(stock))
                .ingredientSku(null)
                .quantity(quantity)
                .reservedQuantity(reserved)
                .availableQuantity(available)
                .threshold(threshold)
                .unitCode(getUnitCode(stock))
                .unitName(getUnitName(stock))
                .detectedAt(Instant.now())
                .severity(calculateSeverity(available, threshold))
                .build();
    }

    private OutOfStockEvent buildOutOfStockEvent(Stock stock,
            BigDecimal quantity,
            BigDecimal reserved,
            BigDecimal available,
            BigDecimal threshold,
            String branchName) {
        return OutOfStockEvent.builder()
                .branchId(stock.getBranchId())
                .branchName(branchName)
                .ingredientId(getIngredientId(stock))
                .ingredientName(getIngredientName(stock))
                .ingredientSku(null)
                .quantity(quantity)
                .reservedQuantity(reserved)
                .availableQuantity(available)
                .threshold(threshold)
                .unitCode(getUnitCode(stock))
                .unitName(getUnitName(stock))
                .detectedAt(Instant.now())
                .build();
    }

    private String calculateSeverity(BigDecimal available, BigDecimal threshold) {
        if (threshold.compareTo(BigDecimal.ZERO) <= 0) {
            return "WARNING";
        }

        BigDecimal ratio = available.divide(threshold, 4, java.math.RoundingMode.HALF_UP);
        if (ratio.compareTo(BigDecimal.valueOf(0.25)) <= 0) {
            return "CRITICAL";
        }
        if (ratio.compareTo(BigDecimal.valueOf(0.5)) <= 0) {
            return "URGENT";
        }
        return "WARNING";
    }

    private Integer getIngredientId(Stock stock) {
        Ingredient ingredient = stock.getIngredient();
        return ingredient != null ? ingredient.getIngredientId() : null;
    }

    private String getIngredientName(Stock stock) {
        Ingredient ingredient = stock.getIngredient();
        return ingredient != null ? ingredient.getName() : null;
    }

    private String getUnitCode(Stock stock) {
        Unit unit = stock.getUnit();
        if (unit == null && stock.getIngredient() != null) {
            unit = stock.getIngredient().getUnit();
        }
        return unit != null ? unit.getCode() : null;
    }

    private String getUnitName(Stock stock) {
        Unit unit = stock.getUnit();
        if (unit == null && stock.getIngredient() != null) {
            unit = stock.getIngredient().getUnit();
        }
        return unit != null ? unit.getName() : null;
    }

    private BigDecimal safeValue(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private String fetchBranchName(Integer branchId) {
        if (branchId == null) {
            return null;
        }
        try {
            var response = branchClient.getBranchById(branchId);
            if (response != null && response.getResult() != null) {
                return response.getResult().getName();
            }
        } catch (Exception e) {
            log.warn("[InventoryAlertService] Failed to fetch branch name for branchId {}: {}", branchId, e.getMessage());
        }
        return null;
    }
}

