package com.service.catalog.service;

import java.time.Instant;
import java.util.List;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.service.catalog.entity.Stock;
import com.service.catalog.repository.StockRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(
        value = "app.inventory-alert.scheduler.enabled",
        havingValue = "true",
        matchIfMissing = true)
public class InventoryAlertScheduler {

    private final StockRepository stockRepository;
    private final InventoryAlertService inventoryAlertService;

    @Scheduled(cron = "${app.inventory-alert.scheduler.cron:0 */1 * * * ?}")
    public void scanForLowStocks() {
        List<Integer> branchIds = stockRepository.findDistinctBranchIds();
        if (branchIds == null || branchIds.isEmpty()) {
            return;
        }

        log.info("[InventoryAlertScheduler] Running safety scan at {}", Instant.now());
        for (Integer branchId : branchIds) {
            if (branchId == null) {
                continue;
            }
            try {
                processBranch(branchId);
            } catch (Exception ex) {
                log.error("[InventoryAlertScheduler] Failed to process branch {}", branchId, ex);
            }
        }
    }

    private void processBranch(Integer branchId) {
        List<Stock> outOfStockItems = stockRepository.findOutOfStockItems(branchId);
        outOfStockItems.forEach(inventoryAlertService::evaluateAndPublish);

        List<Stock> lowStockItems = stockRepository.findStocksNeedingRestock(branchId);
        lowStockItems.forEach(inventoryAlertService::evaluateAndPublish);
    }
}

