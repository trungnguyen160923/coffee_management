package com.service.catalog.service;

import com.service.catalog.dto.request.goodsReceipt.CreateGoodsReceiptRequest;
import com.service.catalog.dto.request.goodsReceipt.GoodsReceiptDetailRequest;
import com.service.catalog.entity.GoodsReceipt;
import com.service.catalog.entity.GoodsReceiptDetail;
import com.service.catalog.dto.response.GoodsReceiptResponse;
import com.service.catalog.entity.*;
import com.service.catalog.constants.ReceiptStatusConstants;
import com.service.catalog.exception.AppException;
import com.service.catalog.exception.ErrorCode;
import com.service.catalog.mapper.GoodsReceiptMapper;
import com.service.catalog.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.lenient;
import org.mockito.ArgumentCaptor;

/**
 * Test cases for GoodsReceiptService - Testing all receipt scenarios:
 * - OK: Normal receipt
 * - SHORT_ACCEPTED / SHORT_PENDING: Shortage handling
 * - OVER_ACCEPTED / OVER_ADJUSTED / OVER_RETURN: Overage handling
 * - DAMAGE_ACCEPTED / DAMAGE_RETURN / DAMAGE_PARTIAL: Damage handling
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("GoodsReceiptService Tests")
class GoodsReceiptServiceTest {

    @Mock
    private GoodsReceiptRepository goodsReceiptRepository;
    
    @Mock
    private GoodsReceiptDetailRepository goodsReceiptDetailRepository;
    
    @Mock
    private PurchaseOrderDetailRepository purchaseOrderDetailRepository;
    
    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;
    
    @Mock
    private SupplierRepository supplierRepository;
    
    @Mock
    private IngredientRepository ingredientRepository;
    
    @Mock
    private UnitRepository unitRepository;
    
    @Mock
    private InventoryTransactionRepository inventoryTransactionRepository;
    
    @Mock
    private StockRepository stockRepository;
    
    @Mock
    private InventoryCostRepository inventoryCostRepository;
    
    @Mock
    private GoodsReceiptMapper goodsReceiptMapper;
    
    @Mock
    private UnitConversionService unitConversionService;
    
    @Mock
    private PurchaseOrderStatusHistoryRepository purchaseOrderStatusHistoryRepository;
    
    @Mock
    private InventoryAlertService inventoryAlertService;

    @InjectMocks
    private GoodsReceiptService goodsReceiptService;

    private PurchaseOrder purchaseOrder;
    private PurchaseOrderDetail poDetail;
    private Supplier supplier;
    private Ingredient ingredient;
    private Unit unit;
    private Stock stock;
    private InventoryCost inventoryCost;

    @BeforeEach
    void setUp() {
        // Setup common test data
        supplier = new Supplier();
        supplier.setSupplierId(1);
        supplier.setName("Test Supplier");

        unit = new Unit();
        unit.setCode("KG");
        unit.setName("Kilogram");

        ingredient = new Ingredient();
        ingredient.setIngredientId(1);
        ingredient.setName("Coffee Beans");
        ingredient.setUnit(unit);

        purchaseOrder = new PurchaseOrder();
        purchaseOrder.setPoId(1);
        purchaseOrder.setPoNumber("PO-001");
        purchaseOrder.setSupplier(supplier);
        purchaseOrder.setBranchId(1);
        purchaseOrder.setStatus("SUPPLIER_CONFIRMED");
        purchaseOrder.setTotalAmount(new BigDecimal("5000000"));
        purchaseOrder.setCreateAt(LocalDateTime.now());

        poDetail = new PurchaseOrderDetail();
        poDetail.setId(1);
        poDetail.setPurchaseOrder(purchaseOrder);
        poDetail.setIngredient(ingredient);
        poDetail.setUnit(unit);
        poDetail.setQty(new BigDecimal("100")); // Ordered 100 KG
        poDetail.setUnitPrice(new BigDecimal("50000"));
        poDetail.setLineTotal(new BigDecimal("5000000"));

        stock = new Stock();
        stock.setIngredient(ingredient);
        stock.setBranchId(1);
        stock.setQuantity(new BigDecimal("50")); // Existing stock: 50 KG
        stock.setUnit(unit);

        inventoryCost = new InventoryCost();
        InventoryCostId costId = new InventoryCostId();
        costId.setBranchId(1);
        costId.setIngredientId(1);
        inventoryCost.setId(costId);
        inventoryCost.setStock(stock);
        inventoryCost.setAvgCost(new BigDecimal("48000")); // Existing avg cost: 48,000 VND/KG
    }

    @Test
    @DisplayName("Test OK: Normal receipt - exact quantity match")
    void testCreateGoodsReceipt_OK() {
        // Arrange
        CreateGoodsReceiptRequest request = createRequest(
            new BigDecimal("100"), // Received 100 KG (exact match)
            ReceiptStatusConstants.OK,
            BigDecimal.ZERO
        );

        setupMocks(request);
        
        GoodsReceipt savedGRN = createMockGoodsReceipt();
        when(goodsReceiptRepository.save(any(GoodsReceipt.class))).thenReturn(savedGRN);
        when(goodsReceiptMapper.toGoodsReceiptResponse(any(GoodsReceipt.class)))
            .thenReturn(new GoodsReceiptResponse());
        
        // Mock findByPurchaseOrderPoId to return receipt details for status calculation
        GoodsReceiptDetail mockDetail = new GoodsReceiptDetail();
        mockDetail.setPurchaseOrderDetail(poDetail);
        mockDetail.setQtyBase(new BigDecimal("100")); // Received 100 KG
        mockDetail.setStatus(ReceiptStatusConstants.OK);
        when(goodsReceiptDetailRepository.findByPurchaseOrderPoId(1))
            .thenReturn(List.of(mockDetail));

        // Act
        GoodsReceiptResponse response = goodsReceiptService.createGoodsReceipt(request);

        // Assert
        assertNotNull(response);
        
        // Verify inventory update: should add full quantity
        ArgumentCaptor<Stock> stockCaptor = ArgumentCaptor.forClass(Stock.class);
        verify(stockRepository, times(1)).save(stockCaptor.capture());
        assertEquals(0, stockCaptor.getValue().getQuantity().compareTo(new BigDecimal("150"))); // 50 + 100 = 150
        
        // Verify inventory transaction created
        ArgumentCaptor<InventoryTransaction> txnCaptor = ArgumentCaptor.forClass(InventoryTransaction.class);
        verify(inventoryTransactionRepository, times(1)).save(txnCaptor.capture());
        assertEquals(0, txnCaptor.getValue().getQtyIn().compareTo(new BigDecimal("100")));
        assertEquals("RECEIPT", txnCaptor.getValue().getTxnType());
        
        // Verify PO status updated
        ArgumentCaptor<PurchaseOrder> poCaptor = ArgumentCaptor.forClass(PurchaseOrder.class);
        verify(purchaseOrderRepository, times(1)).save(poCaptor.capture());
        assertEquals("RECEIVED", poCaptor.getValue().getStatus());
    }

    @Test
    @DisplayName("Test SHORT_ACCEPTED: Accept shortage, no follow-up needed")
    void testCreateGoodsReceipt_SHORT_ACCEPTED() {
        // Arrange
        CreateGoodsReceiptRequest request = createRequest(
            new BigDecimal("80"), // Received 80 KG (short 20 KG)
            ReceiptStatusConstants.SHORT_ACCEPTED,
            BigDecimal.ZERO
        );

        setupMocks(request);
        
        GoodsReceipt savedGRN = createMockGoodsReceipt();
        when(goodsReceiptRepository.save(any(GoodsReceipt.class))).thenReturn(savedGRN);
        when(goodsReceiptMapper.toGoodsReceiptResponse(any(GoodsReceipt.class)))
            .thenReturn(new GoodsReceiptResponse());
        
        // Mock findByPurchaseOrderPoId to return receipt details for status calculation
        GoodsReceiptDetail mockDetail = new GoodsReceiptDetail();
        mockDetail.setPurchaseOrderDetail(poDetail);
        mockDetail.setQtyBase(new BigDecimal("80")); // Received 80 KG (shortage accepted)
        mockDetail.setStatus(ReceiptStatusConstants.SHORT_ACCEPTED);
        when(goodsReceiptDetailRepository.findByPurchaseOrderPoId(1))
            .thenReturn(List.of(mockDetail));

        // Act
        GoodsReceiptResponse response = goodsReceiptService.createGoodsReceipt(request);

        // Assert
        assertNotNull(response);
        
        // Verify inventory update: should add only received quantity (80 KG)
        ArgumentCaptor<Stock> stockCaptor = ArgumentCaptor.forClass(Stock.class);
        verify(stockRepository, times(1)).save(stockCaptor.capture());
        assertEquals(0, stockCaptor.getValue().getQuantity().compareTo(new BigDecimal("130"))); // 50 + 80 = 130
        
        // Verify inventory transaction
        ArgumentCaptor<InventoryTransaction> txnCaptor = ArgumentCaptor.forClass(InventoryTransaction.class);
        verify(inventoryTransactionRepository, times(1)).save(txnCaptor.capture());
        assertEquals(0, txnCaptor.getValue().getQtyIn().compareTo(new BigDecimal("80")));
        
        // Verify PO status
        ArgumentCaptor<PurchaseOrder> poCaptor = ArgumentCaptor.forClass(PurchaseOrder.class);
        verify(purchaseOrderRepository, times(1)).save(poCaptor.capture());
        assertEquals("RECEIVED", poCaptor.getValue().getStatus()); // Accepted shortage = closed
    }

    @Test
    @DisplayName("Test SHORT_PENDING: Shortage pending, can receive more later")
    void testCreateGoodsReceipt_SHORT_PENDING() {
        // Arrange
        CreateGoodsReceiptRequest request = createRequest(
            new BigDecimal("80"), // Received 80 KG (short 20 KG)
            ReceiptStatusConstants.SHORT_PENDING,
            BigDecimal.ZERO
        );

        setupMocks(request);
        
        GoodsReceipt savedGRN = createMockGoodsReceipt();
        when(goodsReceiptRepository.save(any(GoodsReceipt.class))).thenReturn(savedGRN);
        when(goodsReceiptMapper.toGoodsReceiptResponse(any(GoodsReceipt.class)))
            .thenReturn(new GoodsReceiptResponse());

        // Act
        GoodsReceiptResponse response = goodsReceiptService.createGoodsReceipt(request);

        // Assert
        assertNotNull(response);
        
        // Verify inventory update: should add only received quantity (80 KG)
        ArgumentCaptor<Stock> stockCaptor = ArgumentCaptor.forClass(Stock.class);
        verify(stockRepository, times(1)).save(stockCaptor.capture());
        assertEquals(0, stockCaptor.getValue().getQuantity().compareTo(new BigDecimal("130"))); // 50 + 80 = 130
        
        // Verify PO status: PARTIALLY_RECEIVED (can receive more)
        ArgumentCaptor<PurchaseOrder> poCaptor = ArgumentCaptor.forClass(PurchaseOrder.class);
        verify(purchaseOrderRepository, times(1)).save(poCaptor.capture());
        assertEquals("PARTIALLY_RECEIVED", poCaptor.getValue().getStatus());
    }

    @Test
    @DisplayName("Test SHORT_PENDING Follow-up: Receive remaining quantity after shortage")
    void testCreateGoodsReceipt_SHORT_PENDING_FollowUp() {
        // Arrange - Second receipt: 20 KG (remaining after first receipt of 80 KG with SHORT_PENDING)
        CreateGoodsReceiptRequest request2 = createRequest(
            new BigDecimal("20"), // Remaining quantity: 20 KG
            ReceiptStatusConstants.OK,
            BigDecimal.ZERO
        );

        // Setup mocks for second receipt only (we're testing the follow-up scenario)
        when(purchaseOrderRepository.findById(1)).thenReturn(Optional.of(purchaseOrder));
        when(supplierRepository.findById(1)).thenReturn(Optional.of(supplier));
        when(ingredientRepository.findById(1)).thenReturn(Optional.of(ingredient));
        when(unitRepository.findById("KG")).thenReturn(Optional.of(unit));
        when(purchaseOrderDetailRepository.findById(1)).thenReturn(Optional.of(poDetail));
        when(purchaseOrderDetailRepository.findByPurchaseOrderPoId(1))
            .thenReturn(List.of(poDetail));
        
        lenient().when(unitConversionService.getConversionFactor(
            eq(1), eq("KG"), eq("KG"), eq(1)
        )).thenReturn(BigDecimal.ONE);
        
        // Mock stock: After first receipt (80 KG), stock is now 130 KG (50 + 80)
        Stock stockAfterFirstReceipt = new Stock();
        stockAfterFirstReceipt.setIngredient(ingredient);
        stockAfterFirstReceipt.setBranchId(1);
        stockAfterFirstReceipt.setQuantity(new BigDecimal("130")); // 50 + 80 = 130 (after first receipt)
        stockAfterFirstReceipt.setUnit(unit);
        when(stockRepository.findByBranchIdAndIngredientIngredientId(1, 1))
            .thenReturn(Optional.of(stockAfterFirstReceipt));
        
        // Mock inventory cost: Update avg cost after first receipt
        InventoryCost costAfterFirstReceipt = new InventoryCost();
        InventoryCostId costIdAfterFirst = new InventoryCostId();
        costIdAfterFirst.setBranchId(1);
        costIdAfterFirst.setIngredientId(1);
        costAfterFirstReceipt.setId(costIdAfterFirst);
        costAfterFirstReceipt.setStock(stockAfterFirstReceipt);
        costAfterFirstReceipt.setAvgCost(new BigDecimal("48000")); // Keep same for simplicity
        
        lenient().when(inventoryCostRepository.findById(any(InventoryCostId.class)))
            .thenAnswer(invocation -> {
                InventoryCostId id = invocation.getArgument(0);
                if (id.getBranchId() != null && id.getBranchId().equals(1) &&
                    id.getIngredientId() != null && id.getIngredientId().equals(1)) {
                    return Optional.of(costAfterFirstReceipt);
                }
                return Optional.empty();
            });
        
        // Mock: Previous receipt of 80 KG with SHORT_PENDING already received
        GoodsReceiptDetail previousDetail = new GoodsReceiptDetail();
        previousDetail.setPurchaseOrderDetail(poDetail);
        previousDetail.setQtyBase(new BigDecimal("80"));
        previousDetail.setStatus(ReceiptStatusConstants.SHORT_PENDING);
        when(goodsReceiptDetailRepository.findByPurchaseOrderDetailId(anyInt()))
            .thenReturn(List.of(previousDetail));
        
        GoodsReceipt savedGRN2 = createMockGoodsReceipt();
        when(goodsReceiptRepository.save(any(GoodsReceipt.class))).thenReturn(savedGRN2);
        when(goodsReceiptMapper.toGoodsReceiptResponse(any(GoodsReceipt.class)))
            .thenReturn(new GoodsReceiptResponse());
        
        // Mock findByPurchaseOrderPoId to return both receipts (80 + 20 = 100)
        GoodsReceiptDetail firstReceipt = new GoodsReceiptDetail();
        firstReceipt.setPurchaseOrderDetail(poDetail);
        firstReceipt.setQtyBase(new BigDecimal("80"));
        firstReceipt.setStatus(ReceiptStatusConstants.SHORT_PENDING);
        
        GoodsReceiptDetail secondReceipt = new GoodsReceiptDetail();
        secondReceipt.setPurchaseOrderDetail(poDetail);
        secondReceipt.setQtyBase(new BigDecimal("20"));
        secondReceipt.setStatus(ReceiptStatusConstants.OK);
        
        when(goodsReceiptDetailRepository.findByPurchaseOrderPoId(1))
            .thenReturn(List.of(firstReceipt, secondReceipt));

        // Act
        GoodsReceiptResponse response2 = goodsReceiptService.createGoodsReceipt(request2);

        // Assert
        assertNotNull(response2);
        
        // Verify inventory update: should add remaining quantity (20 KG)
        // Note: Stock was already 130 KG after first receipt (50 + 80), now becomes 150 KG (130 + 20)
        ArgumentCaptor<Stock> stockCaptor = ArgumentCaptor.forClass(Stock.class);
        verify(stockRepository, times(1)).save(stockCaptor.capture());
        assertEquals(0, stockCaptor.getValue().getQuantity().compareTo(new BigDecimal("150"))); // 50 + 80 + 20 = 150
        
        // Verify inventory transaction: qtyIn should be 20 KG
        ArgumentCaptor<InventoryTransaction> txnCaptor = ArgumentCaptor.forClass(InventoryTransaction.class);
        verify(inventoryTransactionRepository, times(1)).save(txnCaptor.capture());
        assertEquals(0, txnCaptor.getValue().getQtyIn().compareTo(new BigDecimal("20")));
        
        // Verify PO status: Should be RECEIVED (all received: 80 + 20 = 100)
        ArgumentCaptor<PurchaseOrder> poCaptor = ArgumentCaptor.forClass(PurchaseOrder.class);
        verify(purchaseOrderRepository, times(1)).save(poCaptor.capture());
        assertEquals("RECEIVED", poCaptor.getValue().getStatus());
    }

    @Test
    @DisplayName("Test OVER_ACCEPTED: Accept overage, keep all items")
    void testCreateGoodsReceipt_OVER_ACCEPTED() {
        // Arrange
        CreateGoodsReceiptRequest request = createRequest(
            new BigDecimal("120"), // Received 120 KG (over 20 KG)
            ReceiptStatusConstants.OVER_ACCEPTED,
            BigDecimal.ZERO
        );

        setupMocks(request);
        
        GoodsReceipt savedGRN = createMockGoodsReceipt();
        when(goodsReceiptRepository.save(any(GoodsReceipt.class))).thenReturn(savedGRN);
        when(goodsReceiptMapper.toGoodsReceiptResponse(any(GoodsReceipt.class)))
            .thenReturn(new GoodsReceiptResponse());
        
        // Mock findByPurchaseOrderPoId to return receipt details for status calculation
        GoodsReceiptDetail mockDetail = new GoodsReceiptDetail();
        mockDetail.setPurchaseOrderDetail(poDetail);
        mockDetail.setQtyBase(new BigDecimal("120")); // Received 120 KG (overage accepted)
        mockDetail.setStatus(ReceiptStatusConstants.OVER_ACCEPTED);
        when(goodsReceiptDetailRepository.findByPurchaseOrderPoId(1))
            .thenReturn(List.of(mockDetail));

        // Act
        GoodsReceiptResponse response = goodsReceiptService.createGoodsReceipt(request);

        // Assert
        assertNotNull(response);
        
        // Verify inventory update: should add full quantity including overage (120 KG)
        ArgumentCaptor<Stock> stockCaptor = ArgumentCaptor.forClass(Stock.class);
        verify(stockRepository, times(1)).save(stockCaptor.capture());
        assertEquals(0, stockCaptor.getValue().getQuantity().compareTo(new BigDecimal("170"))); // 50 + 120 = 170
        
        // Verify inventory transaction
        ArgumentCaptor<InventoryTransaction> txnCaptor = ArgumentCaptor.forClass(InventoryTransaction.class);
        verify(inventoryTransactionRepository, times(1)).save(txnCaptor.capture());
        assertEquals(0, txnCaptor.getValue().getQtyIn().compareTo(new BigDecimal("120")));
        
        // Verify PO status
        ArgumentCaptor<PurchaseOrder> poCaptor = ArgumentCaptor.forClass(PurchaseOrder.class);
        verify(purchaseOrderRepository, times(1)).save(poCaptor.capture());
        assertEquals("RECEIVED", poCaptor.getValue().getStatus());
    }

    @Test
    @DisplayName("Test OVER_RETURN: Return excess, only accept ordered quantity")
    void testCreateGoodsReceipt_OVER_RETURN() {
        // Arrange
        CreateGoodsReceiptRequest request = createRequest(
            new BigDecimal("120"), // Received 120 KG (over 20 KG)
            ReceiptStatusConstants.OVER_RETURN,
            BigDecimal.ZERO
        );

        setupMocks(request);
        
        // Mock: No previous receipts initially
        // getTotalReceivedQuantityForPoDetail is called:
        // 1. In buildReceiptDetails to calculate remainingQty (before save) - return empty
        // 2. In createInventoryAndCostForDetails for OVER_RETURN (after save) - return saved detail with 120 KG
        GoodsReceiptDetail savedDetail = new GoodsReceiptDetail();
        savedDetail.setPurchaseOrderDetail(poDetail);
        savedDetail.setQtyBase(new BigDecimal("120")); // Received 120 KG (before capping)
        savedDetail.setStatus(ReceiptStatusConstants.OVER_RETURN);
        
        // Mock: First call returns empty (before save), second call returns saved detail (after save)
        when(goodsReceiptDetailRepository.findByPurchaseOrderDetailId(anyInt()))
            .thenReturn(new ArrayList<>())  // First call in buildReceiptDetails
            .thenReturn(List.of(savedDetail));  // Second call in createInventoryAndCostForDetails
        
        GoodsReceipt savedGRN = createMockGoodsReceipt();
        when(goodsReceiptRepository.save(any(GoodsReceipt.class))).thenReturn(savedGRN);
        when(goodsReceiptMapper.toGoodsReceiptResponse(any(GoodsReceipt.class)))
            .thenReturn(new GoodsReceiptResponse());
        
        // Mock findByPurchaseOrderPoId to return receipt details for status calculation
        // OVER_RETURN: Only 100 KG accepted (ordered qty), 20 KG returned
        GoodsReceiptDetail mockDetail = new GoodsReceiptDetail();
        mockDetail.setPurchaseOrderDetail(poDetail);
        mockDetail.setQtyBase(new BigDecimal("100")); // Only ordered quantity accepted (after capping)
        mockDetail.setStatus(ReceiptStatusConstants.OVER_RETURN);
        when(goodsReceiptDetailRepository.findByPurchaseOrderPoId(1))
            .thenReturn(List.of(mockDetail));

        // Act
        GoodsReceiptResponse response = goodsReceiptService.createGoodsReceipt(request);

        // Assert
        assertNotNull(response);
        
        // Verify inventory update: should add only ordered quantity (100 KG), not overage
        ArgumentCaptor<Stock> stockCaptor = ArgumentCaptor.forClass(Stock.class);
        verify(stockRepository, times(1)).save(stockCaptor.capture());
        assertEquals(0, stockCaptor.getValue().getQuantity().compareTo(new BigDecimal("150"))); // 50 + 100 = 150 (capped at ordered)
        
        // Verify inventory transaction: qtyIn should be capped at remaining (100 KG)
        ArgumentCaptor<InventoryTransaction> txnCaptor = ArgumentCaptor.forClass(InventoryTransaction.class);
        verify(inventoryTransactionRepository, times(1)).save(txnCaptor.capture());
        assertEquals(0, txnCaptor.getValue().getQtyIn().compareTo(new BigDecimal("100"))); // Capped at ordered quantity
        
        // Verify PO status: OVER_RETURN received 100 KG (ordered qty), so PO should be RECEIVED
        ArgumentCaptor<PurchaseOrder> poCaptor = ArgumentCaptor.forClass(PurchaseOrder.class);
        verify(purchaseOrderRepository, times(1)).save(poCaptor.capture());
        assertEquals("RECEIVED", poCaptor.getValue().getStatus());
    }

    @Test
    @DisplayName("Test DAMAGE_ACCEPTED: Accept all damaged items into inventory")
    void testCreateGoodsReceipt_DAMAGE_ACCEPTED() {
        // Arrange
        CreateGoodsReceiptRequest request = createRequest(
            new BigDecimal("100"), // Total received: 100 KG
            ReceiptStatusConstants.DAMAGE_ACCEPTED,
            new BigDecimal("10") // 10 KG damaged
        );

        setupMocks(request);
        
        GoodsReceipt savedGRN = createMockGoodsReceipt();
        when(goodsReceiptRepository.save(any(GoodsReceipt.class))).thenReturn(savedGRN);
        when(goodsReceiptMapper.toGoodsReceiptResponse(any(GoodsReceipt.class)))
            .thenReturn(new GoodsReceiptResponse());
        
        // Mock findByPurchaseOrderPoId to return receipt details for status calculation
        GoodsReceiptDetail mockDetail = new GoodsReceiptDetail();
        mockDetail.setPurchaseOrderDetail(poDetail);
        mockDetail.setQtyBase(new BigDecimal("100")); // Total received: 100 KG (including damaged)
        mockDetail.setStatus(ReceiptStatusConstants.DAMAGE_ACCEPTED);
        when(goodsReceiptDetailRepository.findByPurchaseOrderPoId(1))
            .thenReturn(List.of(mockDetail));

        // Act
        GoodsReceiptResponse response = goodsReceiptService.createGoodsReceipt(request);

        // Assert
        assertNotNull(response);
        
        // Verify inventory update: should add all items including damaged (100 KG)
        ArgumentCaptor<Stock> stockCaptor = ArgumentCaptor.forClass(Stock.class);
        verify(stockRepository, times(1)).save(stockCaptor.capture());
        assertEquals(0, stockCaptor.getValue().getQuantity().compareTo(new BigDecimal("150"))); // 50 + 100 = 150
        
        // Verify inventory transaction includes all items
        ArgumentCaptor<InventoryTransaction> txnCaptor = ArgumentCaptor.forClass(InventoryTransaction.class);
        verify(inventoryTransactionRepository, times(1)).save(txnCaptor.capture());
        assertEquals(0, txnCaptor.getValue().getQtyIn().compareTo(new BigDecimal("100")));
        assertTrue(txnCaptor.getValue().getNote().contains("DAMAGE_ACCEPTED"));
        
        // Verify PO status: DAMAGE_ACCEPTED is a closing status, so PO should be RECEIVED
        ArgumentCaptor<PurchaseOrder> poCaptor = ArgumentCaptor.forClass(PurchaseOrder.class);
        verify(purchaseOrderRepository, times(1)).save(poCaptor.capture());
        assertEquals("RECEIVED", poCaptor.getValue().getStatus());
    }

    @Test
    @DisplayName("Test DAMAGE_PARTIAL: Only accept good items, return damaged")
    void testCreateGoodsReceipt_DAMAGE_PARTIAL() {
        // Arrange
        // Note: FE sends qtyInput = good quantity (90), damageQty = 10
        CreateGoodsReceiptRequest request = createRequest(
            new BigDecimal("90"), // Good quantity: 90 KG
            ReceiptStatusConstants.DAMAGE_PARTIAL,
            new BigDecimal("10") // 10 KG damaged
        );

        setupMocks(request);
        
        GoodsReceipt savedGRN = createMockGoodsReceipt();
        when(goodsReceiptRepository.save(any(GoodsReceipt.class))).thenReturn(savedGRN);
        when(goodsReceiptMapper.toGoodsReceiptResponse(any(GoodsReceipt.class)))
            .thenReturn(new GoodsReceiptResponse());
        
        // Mock findByPurchaseOrderPoId to return receipt details for status calculation
        GoodsReceiptDetail mockDetail = new GoodsReceiptDetail();
        mockDetail.setPurchaseOrderDetail(poDetail);
        mockDetail.setQtyBase(new BigDecimal("90")); // Good quantity: 90 KG
        mockDetail.setStatus(ReceiptStatusConstants.DAMAGE_PARTIAL);
        when(goodsReceiptDetailRepository.findByPurchaseOrderPoId(1))
            .thenReturn(List.of(mockDetail));

        // Act
        GoodsReceiptResponse response = goodsReceiptService.createGoodsReceipt(request);

        // Assert
        assertNotNull(response);
        
        // Verify inventory update: should add only good quantity (90 KG)
        ArgumentCaptor<Stock> stockCaptor = ArgumentCaptor.forClass(Stock.class);
        verify(stockRepository, times(1)).save(stockCaptor.capture());
        assertEquals(0, stockCaptor.getValue().getQuantity().compareTo(new BigDecimal("140"))); // 50 + 90 = 140
        
        // Verify inventory transaction: only good items
        ArgumentCaptor<InventoryTransaction> txnCaptor = ArgumentCaptor.forClass(InventoryTransaction.class);
        verify(inventoryTransactionRepository, times(1)).save(txnCaptor.capture());
        assertEquals(0, txnCaptor.getValue().getQtyIn().compareTo(new BigDecimal("90")));
        assertTrue(txnCaptor.getValue().getNote().contains("DAMAGE_PARTIAL"));
    }

    @Test
    @DisplayName("Test DAMAGE_RETURN: Return damaged items, only accept good")
    void testCreateGoodsReceipt_DAMAGE_RETURN() {
        // Arrange
        CreateGoodsReceiptRequest request = createRequest(
            new BigDecimal("90"), // Good quantity: 90 KG
            ReceiptStatusConstants.DAMAGE_RETURN,
            new BigDecimal("10") // 10 KG damaged
        );

        setupMocks(request);
        
        GoodsReceipt savedGRN = createMockGoodsReceipt();
        when(goodsReceiptRepository.save(any(GoodsReceipt.class))).thenReturn(savedGRN);
        when(goodsReceiptMapper.toGoodsReceiptResponse(any(GoodsReceipt.class)))
            .thenReturn(new GoodsReceiptResponse());
        
        // Mock findByPurchaseOrderPoId to return receipt details for status calculation
        GoodsReceiptDetail mockDetail = new GoodsReceiptDetail();
        mockDetail.setPurchaseOrderDetail(poDetail);
        mockDetail.setQtyBase(new BigDecimal("90")); // Good quantity: 90 KG
        mockDetail.setStatus(ReceiptStatusConstants.DAMAGE_RETURN);
        when(goodsReceiptDetailRepository.findByPurchaseOrderPoId(1))
            .thenReturn(List.of(mockDetail));

        // Act
        GoodsReceiptResponse response = goodsReceiptService.createGoodsReceipt(request);

        // Assert
        assertNotNull(response);
        
        // Verify inventory update: should add only good quantity (90 KG)
        ArgumentCaptor<Stock> stockCaptor = ArgumentCaptor.forClass(Stock.class);
        verify(stockRepository, times(1)).save(stockCaptor.capture());
        assertEquals(0, stockCaptor.getValue().getQuantity().compareTo(new BigDecimal("140"))); // 50 + 90 = 140
        
        // Verify inventory transaction
        ArgumentCaptor<InventoryTransaction> txnCaptor = ArgumentCaptor.forClass(InventoryTransaction.class);
        verify(inventoryTransactionRepository, times(1)).save(txnCaptor.capture());
        assertEquals(0, txnCaptor.getValue().getQtyIn().compareTo(new BigDecimal("90")));
        assertTrue(txnCaptor.getValue().getNote().contains("DAMAGE_RETURN"));
    }

    @Test
    @DisplayName("Test validation: SHORT status requires qtyInput < remainingQty")
    void testValidation_SHORT_RequiresLessThanRemaining() {
        // Arrange
        CreateGoodsReceiptRequest request = createRequest(
            new BigDecimal("100"), // Received 100 (equal to remaining, should fail)
            ReceiptStatusConstants.SHORT,
            BigDecimal.ZERO
        );

        setupMocksForValidation(); // Use minimal setup for validation tests

        // Act & Assert
        AppException exception = assertThrows(AppException.class, () -> {
            goodsReceiptService.createGoodsReceipt(request);
        });

        assertEquals(ErrorCode.VALIDATION_FAILED, exception.getErrorCode());
        assertTrue(exception.getMessage().contains("SHORT status requires quantity less than remaining"));
    }

    @Test
    @DisplayName("Test validation: OVER status requires qtyInput > remainingQty")
    void testValidation_OVER_RequiresMoreThanRemaining() {
        // Arrange
        CreateGoodsReceiptRequest request = createRequest(
            new BigDecimal("100"), // Received 100 (equal to remaining, should fail)
            ReceiptStatusConstants.OVER,
            BigDecimal.ZERO
        );

        setupMocksForValidation(); // Use minimal setup for validation tests

        // Act & Assert
        AppException exception = assertThrows(AppException.class, () -> {
            goodsReceiptService.createGoodsReceipt(request);
        });

        assertEquals(ErrorCode.VALIDATION_FAILED, exception.getErrorCode());
        assertTrue(exception.getMessage().contains("OVER status requires quantity more than remaining"));
    }

    @Test
    @DisplayName("Test validation: DAMAGE status requires damageQty > 0")
    void testValidation_DAMAGE_RequiresDamageQty() {
        // Arrange
        CreateGoodsReceiptRequest request = createRequest(
            new BigDecimal("100"),
            ReceiptStatusConstants.DAMAGE,
            BigDecimal.ZERO // No damage quantity, should fail
        );

        setupMocksForValidation(); // Use minimal setup for validation tests

        // Act & Assert
        AppException exception = assertThrows(AppException.class, () -> {
            goodsReceiptService.createGoodsReceipt(request);
        });

        assertEquals(ErrorCode.VALIDATION_FAILED, exception.getErrorCode());
        assertTrue(exception.getMessage().contains("DAMAGE status requires damage quantity > 0"));
    }

    @Test
    @DisplayName("Test average cost calculation: Weighted average")
    void testAverageCostCalculation() {
        // Arrange
        CreateGoodsReceiptRequest request = createRequest(
            new BigDecimal("100"),
            ReceiptStatusConstants.OK,
            BigDecimal.ZERO
        );

        setupMocks(request);
        
        GoodsReceipt savedGRN = createMockGoodsReceipt();
        when(goodsReceiptRepository.save(any(GoodsReceipt.class))).thenReturn(savedGRN);
        when(goodsReceiptMapper.toGoodsReceiptResponse(any(GoodsReceipt.class)))
            .thenReturn(new GoodsReceiptResponse());
        
        // Mock findByPurchaseOrderPoId to return receipt details for status calculation
        GoodsReceiptDetail mockDetail = new GoodsReceiptDetail();
        mockDetail.setPurchaseOrderDetail(poDetail);
        mockDetail.setQtyBase(new BigDecimal("100")); // Received 100 KG
        mockDetail.setStatus(ReceiptStatusConstants.OK);
        when(goodsReceiptDetailRepository.findByPurchaseOrderPoId(1))
            .thenReturn(List.of(mockDetail));

        // Act
        goodsReceiptService.createGoodsReceipt(request);

        // Assert
        // Expected avg cost = (50 * 48000 + 100 * 50000) / (50 + 100) = 49333.33
        ArgumentCaptor<InventoryCost> costCaptor = ArgumentCaptor.forClass(InventoryCost.class);
        verify(inventoryCostRepository, times(1)).save(costCaptor.capture());
        BigDecimal expectedAvg = new BigDecimal("49333.3333");
        BigDecimal actualAvg = costCaptor.getValue().getAvgCost();
        assertTrue(actualAvg.subtract(expectedAvg).abs().compareTo(new BigDecimal("0.01")) < 0);
    }

    @Test
    @DisplayName("Test partial receipt: Multiple receipts for same PO detail")
    void testPartialReceipt_MultipleReceipts() {
        // Arrange - Second receipt: 40 KG (remaining after first receipt of 60 KG)
        CreateGoodsReceiptRequest request2 = createRequest(
            new BigDecimal("40"),
            ReceiptStatusConstants.OK,
            BigDecimal.ZERO
        );

        // Setup mocks for second receipt only (we're testing the second receipt scenario)
        when(purchaseOrderRepository.findById(1)).thenReturn(Optional.of(purchaseOrder));
        when(supplierRepository.findById(1)).thenReturn(Optional.of(supplier));
        when(ingredientRepository.findById(1)).thenReturn(Optional.of(ingredient));
        when(unitRepository.findById("KG")).thenReturn(Optional.of(unit));
        when(purchaseOrderDetailRepository.findById(1)).thenReturn(Optional.of(poDetail));
        when(purchaseOrderDetailRepository.findByPurchaseOrderPoId(1))
            .thenReturn(List.of(poDetail));
        
        lenient().when(unitConversionService.getConversionFactor(
            eq(1), eq("KG"), eq("KG"), eq(1)
        )).thenReturn(BigDecimal.ONE);
        
        when(stockRepository.findByBranchIdAndIngredientIngredientId(1, 1))
            .thenReturn(Optional.of(stock));
        
        lenient().when(inventoryCostRepository.findById(any(InventoryCostId.class)))
            .thenAnswer(invocation -> {
                InventoryCostId id = invocation.getArgument(0);
                if (id.getBranchId() != null && id.getBranchId().equals(1) &&
                    id.getIngredientId() != null && id.getIngredientId().equals(1)) {
                    return Optional.of(inventoryCost);
                }
                return Optional.empty();
            });
        
        // Mock: Previous receipt of 60 KG already received
        GoodsReceiptDetail previousDetail = new GoodsReceiptDetail();
        previousDetail.setPurchaseOrderDetail(poDetail);
        previousDetail.setQtyBase(new BigDecimal("60"));
        previousDetail.setStatus(ReceiptStatusConstants.OK);
        when(goodsReceiptDetailRepository.findByPurchaseOrderDetailId(anyInt()))
            .thenReturn(List.of(previousDetail));
        
        GoodsReceipt savedGRN2 = createMockGoodsReceipt();
        when(goodsReceiptRepository.save(any(GoodsReceipt.class))).thenReturn(savedGRN2);
        when(goodsReceiptMapper.toGoodsReceiptResponse(any(GoodsReceipt.class)))
            .thenReturn(new GoodsReceiptResponse());
        
        // Mock findByPurchaseOrderPoId to return both receipts (60 + 40 = 100)
        GoodsReceiptDetail firstReceipt = new GoodsReceiptDetail();
        firstReceipt.setPurchaseOrderDetail(poDetail);
        firstReceipt.setQtyBase(new BigDecimal("60"));
        firstReceipt.setStatus(ReceiptStatusConstants.OK);
        
        GoodsReceiptDetail secondReceipt = new GoodsReceiptDetail();
        secondReceipt.setPurchaseOrderDetail(poDetail);
        secondReceipt.setQtyBase(new BigDecimal("40"));
        secondReceipt.setStatus(ReceiptStatusConstants.OK);
        
        when(goodsReceiptDetailRepository.findByPurchaseOrderPoId(1))
            .thenReturn(List.of(firstReceipt, secondReceipt));

        // Act
        GoodsReceiptResponse response2 = goodsReceiptService.createGoodsReceipt(request2);

        // Assert
        assertNotNull(response2);
        
        // Verify PO status updated to RECEIVED (all received: 60 + 40 = 100)
        ArgumentCaptor<PurchaseOrder> poCaptor = ArgumentCaptor.forClass(PurchaseOrder.class);
        verify(purchaseOrderRepository, times(1)).save(poCaptor.capture());
        assertEquals("RECEIVED", poCaptor.getValue().getStatus());
    }

    // Helper methods

    private CreateGoodsReceiptRequest createRequest(
            BigDecimal qtyInput, 
            String status, 
            BigDecimal damageQty) {
        CreateGoodsReceiptRequest request = CreateGoodsReceiptRequest.builder()
            .poId(1)
            .supplierId(1)
            .branchId(1)
            .receivedBy(1)
            .build();

        GoodsReceiptDetailRequest detailRequest = GoodsReceiptDetailRequest.builder()
            .poDetailId(1)
            .ingredientId(1)
            .unitCodeInput("KG")
            .qtyInput(qtyInput)
            .unitPrice(new BigDecimal("50000"))
            .status(status)
            .damageQty(damageQty)
            .note("Test note")
            .build();

        request.setDetails(List.of(detailRequest));
        return request;
    }

    private void setupMocks(CreateGoodsReceiptRequest request) {
        // Mock repositories
        when(purchaseOrderRepository.findById(1)).thenReturn(Optional.of(purchaseOrder));
        when(supplierRepository.findById(1)).thenReturn(Optional.of(supplier));
        when(ingredientRepository.findById(1)).thenReturn(Optional.of(ingredient));
        when(unitRepository.findById("KG")).thenReturn(Optional.of(unit));
        when(purchaseOrderDetailRepository.findById(1)).thenReturn(Optional.of(poDetail));
        when(purchaseOrderDetailRepository.findByPurchaseOrderPoId(1))
            .thenReturn(List.of(poDetail));

        // Mock unit conversion (1:1 for same unit)
        when(unitConversionService.getConversionFactor(
            eq(1), eq("KG"), eq("KG"), eq(1)
        )).thenReturn(BigDecimal.ONE);

        // Mock stock
        when(stockRepository.findByBranchIdAndIngredientIngredientId(1, 1))
            .thenReturn(Optional.of(stock));

        // Mock inventory cost - use any() because InventoryCostId is created new in actual code
        lenient().when(inventoryCostRepository.findById(any(InventoryCostId.class)))
            .thenAnswer(invocation -> {
                InventoryCostId id = invocation.getArgument(0);
                if (id.getBranchId() != null && id.getBranchId().equals(1) &&
                    id.getIngredientId() != null && id.getIngredientId().equals(1)) {
                    return Optional.of(inventoryCost);
                }
                return Optional.empty();
            });

        // Mock no previous receipts (for first receipt)
        when(goodsReceiptDetailRepository.findByPurchaseOrderDetailId(anyInt()))
            .thenReturn(new ArrayList<>());
    }

    /**
     * Setup minimal mocks for validation tests (tests that throw exceptions early)
     */
    private void setupMocksForValidation() {
        // Only setup what's needed for validation
        when(purchaseOrderRepository.findById(1)).thenReturn(Optional.of(purchaseOrder));
        when(supplierRepository.findById(1)).thenReturn(Optional.of(supplier));
        when(ingredientRepository.findById(1)).thenReturn(Optional.of(ingredient));
        when(unitRepository.findById("KG")).thenReturn(Optional.of(unit));
        when(purchaseOrderDetailRepository.findById(1)).thenReturn(Optional.of(poDetail));
        when(unitConversionService.getConversionFactor(
            eq(1), eq("KG"), eq("KG"), eq(1)
        )).thenReturn(BigDecimal.ONE);
        when(goodsReceiptDetailRepository.findByPurchaseOrderDetailId(anyInt()))
            .thenReturn(new ArrayList<>());
    }

    private GoodsReceipt createMockGoodsReceipt() {
        GoodsReceipt grn = new GoodsReceipt();
        grn.setGrnNumber("GRN-TEST001");
        grn.setPurchaseOrder(purchaseOrder);
        grn.setSupplier(supplier);
        grn.setBranchId(1);
        grn.setTotalAmount(new BigDecimal("5000000"));
        grn.setReceivedAt(LocalDateTime.now());
        grn.setCreateAt(LocalDateTime.now());
        return grn;
    }
}

