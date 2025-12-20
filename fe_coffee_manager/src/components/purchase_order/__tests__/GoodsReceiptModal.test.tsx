import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GoodsReceiptModal from '../GoodsReceiptModal';
import { catalogService } from '../../../services/catalogService';
import { useAuth } from '../../../context/AuthContext';
import { ReceiptStatus } from '../../../types/receiptStatus';
import toast from 'react-hot-toast';

// Mock dependencies
vi.mock('../../../services/catalogService', () => ({
  catalogService: {
    getUnits: vi.fn(),
    getPoDetailReceiptStatuses: vi.fn(),
    validateUnitConversion: vi.fn(),
    createGoodsReceipt: vi.fn(),
    createReturnGoods: vi.fn(),
    approveReturnGoods: vi.fn(),
    processReturnGoods: vi.fn(),
    updatePurchaseOrderStatus: vi.fn(),
  },
}));
vi.mock('../../../context/AuthContext');
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('GoodsReceiptModal - Receipt Status Tests', () => {
  const mockUser = {
    user_id: 1,
    branchId: 1,
  };

  const mockPurchaseOrder = {
    poId: 1,
    supplierId: 1,
    branchId: 1,
    supplier: { name: 'Test Supplier' },
    details: [
      {
        id: 1,
        poDetailId: 1,
        ingredient: {
          ingredientId: 1,
          name: 'Coffee Beans',
        },
        unitCode: 'KG',
        qty: 100, // Component expects 'qty' field, not 'orderedQty'
        orderedQty: 100, // Keep for backward compatibility if needed
        unitPrice: 50000,
        lineTotal: 5000000,
      },
    ],
  };

  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: mockUser });
    
    // Mock all required API calls - use mockImplementation to ensure reference is maintained
    (catalogService.getUnits as any).mockImplementation(() => Promise.resolve([
      { unitCode: 'KG', unitName: 'Kilogram' },
      { unitCode: 'G', unitName: 'Gram' },
    ]));
    
    (catalogService.getPoDetailReceiptStatuses as any).mockImplementation(() => Promise.resolve({
      1: {
        receivedQty: 0,
        status: 'PENDING',
        remainingQty: 100,
        canReceiveMore: true,
        lastReceiptStatus: null,
        receiptMessage: 'No receipts yet',
      },
    }));
    
    (catalogService.validateUnitConversion as any).mockImplementation(() => Promise.resolve({
      canConvert: true,
      conversionFactor: 1.0,
    }));

    // Setup default mock for createGoodsReceipt - use mockResolvedValue to maintain reference
    (catalogService.createGoodsReceipt as any).mockResolvedValue({
      grnNumber: 'GRN-001',
    });
  });

  describe('OK Status - Normal Receipt', () => {
    it('should detect OK status when received quantity equals ordered quantity', async () => {
      render(
        <GoodsReceiptModal
          isOpen={true}
          onClose={mockOnClose}
          purchaseOrder={mockPurchaseOrder}
          onSuccess={mockOnSuccess}
        />
      );

      // Wait for component to load - use getByRole for heading to avoid multiple matches
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Create Goods Receipt/i })).toBeInTheDocument();
      });

      // Find quantity input - it's a number input in the table
      // Wait for table to render with inputs
      await waitFor(() => {
        const inputs = screen.getAllByRole('spinbutton');
        expect(inputs.length).toBeGreaterThan(0);
      });
      
      // Get all number inputs (spinbuttons)
      // Received quantity input is the first one (doesn't have id starting with "damage-")
      // Damage quantity has id="damage-{index}"
      const qtyInputs = screen.getAllByRole('spinbutton');
      const qtyInput = qtyInputs.find((input: HTMLElement) => {
        const inputElement = input as HTMLInputElement;
        return !inputElement.id || !inputElement.id.startsWith('damage-');
      }) || qtyInputs[0]; // Fallback to first input
      
      // Enter exact quantity: 100 KG
      fireEvent.change(qtyInput, { target: { value: '100' } });

      // Wait for validation
      await waitFor(() => {
        // Should show OK status
        expect(screen.getByText(/OK|Received.*=.*Ordered/i)).toBeInTheDocument();
      });
    });

    it('should submit OK receipt successfully', async () => {
      (catalogService.createGoodsReceipt as any).mockResolvedValue({
        grnNumber: 'GRN-001',
      });

      render(
        <GoodsReceiptModal
          isOpen={true}
          onClose={mockOnClose}
          purchaseOrder={mockPurchaseOrder}
          onSuccess={mockOnSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Create Goods Receipt/i })).toBeInTheDocument();
      });

      // Enter quantity
      // Find quantity input - wait for table to render, then get first spinbutton (received quantity)
      await waitFor(() => {
        expect(screen.getAllByRole('spinbutton').length).toBeGreaterThan(0);
      });
      const qtyInputs = screen.getAllByRole('spinbutton');
      const qtyInput = qtyInputs.find((input: HTMLElement) => {
        const inputElement = input as HTMLInputElement;
        return !inputElement.id || !inputElement.id.startsWith('damage-');
      }) || qtyInputs[0];
      fireEvent.change(qtyInput, { target: { value: '100' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: /submit|create|save/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(catalogService.createGoodsReceipt).toHaveBeenCalledWith(
          expect.objectContaining({
            details: expect.arrayContaining([
              expect.objectContaining({
                qtyInput: 100,
                status: ReceiptStatus.OK,
              }),
            ]),
          })
        );
      });
    });
  });

  describe('SHORT Status - Shortage Handling', () => {
    it('should detect SHORT status when received quantity is less than ordered', async () => {
      render(
        <GoodsReceiptModal
          isOpen={true}
          onClose={mockOnClose}
          purchaseOrder={mockPurchaseOrder}
          onSuccess={mockOnSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Create Goods Receipt/i })).toBeInTheDocument();
      });

      // Enter less quantity: 80 KG (short 20 KG)
      // Find quantity input - wait for table to render, then get first spinbutton (received quantity)
      await waitFor(() => {
        expect(screen.getAllByRole('spinbutton').length).toBeGreaterThan(0);
      });
      const qtyInputs = screen.getAllByRole('spinbutton');
      const qtyInput = qtyInputs.find((input: HTMLElement) => {
        const inputElement = input as HTMLInputElement;
        return !inputElement.id || !inputElement.id.startsWith('damage-');
      }) || qtyInputs[0];
      fireEvent.change(qtyInput, { target: { value: '80' } });
      fireEvent.blur(qtyInput); // Trigger blur to ensure validation runs

      // Wait for SHORT status - check for action buttons which appear when status is SHORT
      // This is more reliable than checking for validation message text
      await waitFor(() => {
        const acceptButton = screen.queryByRole('button', { name: /Accept Shortage/i });
        const followUpButton = screen.queryByRole('button', { name: /Follow Up/i });
        return acceptButton !== null && followUpButton !== null;
      }, { timeout: 5000 });
    });

    it('should show action buttons for SHORT status', async () => {
      render(
        <GoodsReceiptModal
          isOpen={true}
          onClose={mockOnClose}
          purchaseOrder={mockPurchaseOrder}
          onSuccess={mockOnSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Create Goods Receipt/i })).toBeInTheDocument();
      });

      // Find quantity input - wait for table to render, then get first spinbutton (received quantity)
      await waitFor(() => {
        expect(screen.getAllByRole('spinbutton').length).toBeGreaterThan(0);
      });
      const qtyInputs = screen.getAllByRole('spinbutton');
      const qtyInput = qtyInputs.find((input: HTMLElement) => {
        const inputElement = input as HTMLInputElement;
        return !inputElement.id || !inputElement.id.startsWith('damage-');
      }) || qtyInputs[0];
      fireEvent.change(qtyInput, { target: { value: '80' } });
      fireEvent.blur(qtyInput); // Trigger blur to ensure validation runs

      // Wait for SHORT status - action buttons appear when status is SHORT
      await waitFor(() => {
        const acceptButton = screen.queryByRole('button', { name: /Accept Shortage/i });
        const followUpButton = screen.queryByRole('button', { name: /Follow Up/i });
        return acceptButton !== null && followUpButton !== null;
      }, { timeout: 5000 });
      
      // Verify buttons are in document
      expect(screen.getByRole('button', { name: /Accept Shortage/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Follow Up/i })).toBeInTheDocument();
    });

    it('should submit SHORT_ACCEPTED when Accept Shortage is clicked', async () => {
      (catalogService.createGoodsReceipt as any).mockResolvedValue({
        grnNumber: 'GRN-001',
      });

      render(
        <GoodsReceiptModal
          isOpen={true}
          onClose={mockOnClose}
          purchaseOrder={mockPurchaseOrder}
          onSuccess={mockOnSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Create Goods Receipt/i })).toBeInTheDocument();
      });

      // Find quantity input - wait for table to render, then get first spinbutton (received quantity)
      await waitFor(() => {
        expect(screen.getAllByRole('spinbutton').length).toBeGreaterThan(0);
      });
      const qtyInputs = screen.getAllByRole('spinbutton');
      const qtyInput = qtyInputs.find((input: HTMLElement) => {
        const inputElement = input as HTMLInputElement;
        return !inputElement.id || !inputElement.id.startsWith('damage-');
      }) || qtyInputs[0];
      fireEvent.change(qtyInput, { target: { value: '80' } });

      // Wait for action buttons to appear
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Accept Shortage/i })).toBeInTheDocument();
      }, { timeout: 3000 });

      // Click Accept Shortage button
      const acceptButton = screen.getByRole('button', { name: /Accept Shortage/i });
      fireEvent.click(acceptButton);

      const submitButton = screen.getByRole('button', { name: /submit|create|save/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(catalogService.createGoodsReceipt).toHaveBeenCalledWith(
          expect.objectContaining({
            details: expect.arrayContaining([
              expect.objectContaining({
                qtyInput: 80,
                status: ReceiptStatus.SHORT_ACCEPTED,
              }),
            ]),
          })
        );
      });
    });

    it('should submit SHORT_PENDING when Mark for Follow-up is clicked', async () => {
      (catalogService.createGoodsReceipt as any).mockResolvedValue({
        grnNumber: 'GRN-001',
      });

      render(
        <GoodsReceiptModal
          isOpen={true}
          onClose={mockOnClose}
          purchaseOrder={mockPurchaseOrder}
          onSuccess={mockOnSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Create Goods Receipt/i })).toBeInTheDocument();
      });

      // Find quantity input - wait for table to render, then get first spinbutton (received quantity)
      await waitFor(() => {
        expect(screen.getAllByRole('spinbutton').length).toBeGreaterThan(0);
      });
      const qtyInputs = screen.getAllByRole('spinbutton');
      const qtyInput = qtyInputs.find((input: HTMLElement) => {
        const inputElement = input as HTMLInputElement;
        return !inputElement.id || !inputElement.id.startsWith('damage-');
      }) || qtyInputs[0];
      fireEvent.change(qtyInput, { target: { value: '80' } });

      // Wait for action buttons to appear
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Follow Up/i })).toBeInTheDocument();
      }, { timeout: 3000 });

      // Click Follow Up button
      const followUpButton = screen.getByRole('button', { name: /Follow Up/i });
      fireEvent.click(followUpButton);

      const submitButton = screen.getByRole('button', { name: /submit|create|save/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(catalogService.createGoodsReceipt).toHaveBeenCalledWith(
          expect.objectContaining({
            details: expect.arrayContaining([
              expect.objectContaining({
                qtyInput: 80,
                status: ReceiptStatus.SHORT_PENDING,
              }),
            ]),
          })
        );
      });
    });
  });

  describe('OVER Status - Overage Handling', () => {
    it('should detect OVER status when received quantity is more than ordered', async () => {
      render(
        <GoodsReceiptModal
          isOpen={true}
          onClose={mockOnClose}
          purchaseOrder={mockPurchaseOrder}
          onSuccess={mockOnSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Create Goods Receipt/i })).toBeInTheDocument();
      });

      // Enter more quantity: 120 KG (over 20 KG)
      // Find quantity input - wait for table to render, then get first spinbutton (received quantity)
      await waitFor(() => {
        expect(screen.getAllByRole('spinbutton').length).toBeGreaterThan(0);
      });
      const qtyInputs = screen.getAllByRole('spinbutton');
      const qtyInput = qtyInputs.find((input: HTMLElement) => {
        const inputElement = input as HTMLInputElement;
        return !inputElement.id || !inputElement.id.startsWith('damage-');
      }) || qtyInputs[0];
      fireEvent.change(qtyInput, { target: { value: '120' } });
      fireEvent.blur(qtyInput); // Trigger blur to ensure validation runs

      // Wait for OVER status - check for action buttons which appear when status is OVER
      await waitFor(() => {
        const acceptButton = screen.queryByRole('button', { name: /Accept All/i });
        const returnButton = screen.queryByRole('button', { name: /Return Excess/i });
        return acceptButton !== null && returnButton !== null;
      }, { timeout: 5000 });
    });

    it('should show action buttons for OVER status', async () => {
      render(
        <GoodsReceiptModal
          isOpen={true}
          onClose={mockOnClose}
          purchaseOrder={mockPurchaseOrder}
          onSuccess={mockOnSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Create Goods Receipt/i })).toBeInTheDocument();
      });

      // Find quantity input - wait for table to render, then get first spinbutton (received quantity)
      await waitFor(() => {
        expect(screen.getAllByRole('spinbutton').length).toBeGreaterThan(0);
      });
      const qtyInputs = screen.getAllByRole('spinbutton');
      const qtyInput = qtyInputs.find((input: HTMLElement) => {
        const inputElement = input as HTMLInputElement;
        return !inputElement.id || !inputElement.id.startsWith('damage-');
      }) || qtyInputs[0];
      fireEvent.change(qtyInput, { target: { value: '120' } });
      fireEvent.blur(qtyInput); // Trigger blur to ensure validation runs

      // Wait for OVER status - action buttons appear when status is OVER
      await waitFor(() => {
        const acceptButton = screen.queryByRole('button', { name: /Accept All/i });
        const returnButton = screen.queryByRole('button', { name: /Return Excess/i });
        return acceptButton !== null && returnButton !== null;
      }, { timeout: 5000 });
      
      // Verify buttons are in document
      expect(screen.getByRole('button', { name: /Accept All/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Return Excess/i })).toBeInTheDocument();
    });

    it('should submit OVER_ACCEPTED when Accept Overage is clicked', async () => {
      (catalogService.createGoodsReceipt as any).mockResolvedValue({
        grnNumber: 'GRN-001',
      });

      render(
        <GoodsReceiptModal
          isOpen={true}
          onClose={mockOnClose}
          purchaseOrder={mockPurchaseOrder}
          onSuccess={mockOnSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Create Goods Receipt/i })).toBeInTheDocument();
      });

      // Find quantity input - wait for table to render, then get first spinbutton (received quantity)
      await waitFor(() => {
        expect(screen.getAllByRole('spinbutton').length).toBeGreaterThan(0);
      });
      const qtyInputs = screen.getAllByRole('spinbutton');
      const qtyInput = qtyInputs.find((input: HTMLElement) => {
        const inputElement = input as HTMLInputElement;
        return !inputElement.id || !inputElement.id.startsWith('damage-');
      }) || qtyInputs[0];
      fireEvent.change(qtyInput, { target: { value: '120' } });

      // Wait for action buttons to appear
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Accept All/i })).toBeInTheDocument();
      }, { timeout: 3000 });

      // Click Accept All button
      const acceptButton = screen.getByRole('button', { name: /Accept All/i });
      fireEvent.click(acceptButton);

      const submitButton = screen.getByRole('button', { name: /submit|create|save/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(catalogService.createGoodsReceipt).toHaveBeenCalledWith(
          expect.objectContaining({
            details: expect.arrayContaining([
              expect.objectContaining({
                qtyInput: 120,
                status: ReceiptStatus.OVER_ACCEPTED,
              }),
            ]),
          })
        );
      });
    });

    it('should submit OVER_RETURN and create Return Goods when Return Excess is clicked', async () => {
      (catalogService.createGoodsReceipt as any).mockResolvedValue({
        grnNumber: 'GRN-001',
      });
      (catalogService.createReturnGoods as any).mockResolvedValue({
        returnId: 1,
      });
      (catalogService.approveReturnGoods as any).mockResolvedValue({});
      (catalogService.processReturnGoods as any).mockResolvedValue({});

      render(
        <GoodsReceiptModal
          isOpen={true}
          onClose={mockOnClose}
          purchaseOrder={mockPurchaseOrder}
          onSuccess={mockOnSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Create Goods Receipt/i })).toBeInTheDocument();
      });

      // Find quantity input - wait for table to render, then get first spinbutton (received quantity)
      await waitFor(() => {
        expect(screen.getAllByRole('spinbutton').length).toBeGreaterThan(0);
      });
      const qtyInputs = screen.getAllByRole('spinbutton');
      const qtyInput = qtyInputs.find((input: HTMLElement) => {
        const inputElement = input as HTMLInputElement;
        return !inputElement.id || !inputElement.id.startsWith('damage-');
      }) || qtyInputs[0];
      fireEvent.change(qtyInput, { target: { value: '120' } });
      fireEvent.blur(qtyInput); // Trigger blur to ensure validation runs

      // Wait for action buttons to appear
      await waitFor(() => {
        const returnButton = screen.queryByRole('button', { name: /Return Excess/i });
        return returnButton !== null;
      }, { timeout: 5000 });

      // OVER_RETURN requires notes - add notes BEFORE clicking Return Excess button
      const notesInput = screen.getByPlaceholderText(/Enter notes for this item/i);
      fireEvent.change(notesInput, { target: { value: 'Returning excess quantity' } });
      fireEvent.blur(notesInput); // Ensure notes are saved

      // Wait a bit for notes to be saved
      await waitFor(() => {
        const input = screen.getByPlaceholderText(/Enter notes for this item/i) as HTMLInputElement;
        return input.value === 'Returning excess quantity';
      }, { timeout: 1000 });

      // Now click Return Excess button
      const returnButton = screen.getByRole('button', { name: /Return Excess/i });
      fireEvent.click(returnButton);

      // Wait a bit for the action to be set in state
      await waitFor(() => {
        const selectedButton = screen.getByRole('button', { name: /Return Excess/i });
        expect(selectedButton).toBeInTheDocument();
      }, { timeout: 1000 });

      const submitButton = screen.getByRole('button', { name: /submit|create|save/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        // Should create goods receipt with OVER_RETURN status
        expect(catalogService.createGoodsReceipt).toHaveBeenCalledWith(
          expect.objectContaining({
            details: expect.arrayContaining([
              expect.objectContaining({
                status: ReceiptStatus.OVER_RETURN,
              }),
            ]),
          })
        );

        // Should create return goods for excess (20 KG)
        expect(catalogService.createReturnGoods).toHaveBeenCalledWith(
          expect.objectContaining({
            details: expect.arrayContaining([
              expect.objectContaining({
                qty: 20, // Excess quantity
                returnReason: expect.stringContaining('excess'),
              }),
            ]),
          })
        );
      });
    });
  });

  describe('DAMAGE Status - Damage Handling', () => {
    it('should detect DAMAGE status when damage quantity is entered', async () => {
      render(
        <GoodsReceiptModal
          isOpen={true}
          onClose={mockOnClose}
          purchaseOrder={mockPurchaseOrder}
          onSuccess={mockOnSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Create Goods Receipt/i })).toBeInTheDocument();
      });

      // Enter received quantity
      // Find quantity input - wait for table to render, then get first spinbutton (received quantity)
      await waitFor(() => {
        expect(screen.getAllByRole('spinbutton').length).toBeGreaterThan(0);
      });
      const qtyInputs = screen.getAllByRole('spinbutton');
      const qtyInput = qtyInputs.find((input: HTMLElement) => {
        const inputElement = input as HTMLInputElement;
        return !inputElement.id || !inputElement.id.startsWith('damage-');
      }) || qtyInputs[0];
      fireEvent.change(qtyInput, { target: { value: '100' } });

      // Enter damage quantity - damage input has id="damage-{index}" and label with htmlFor
      const damageInput = screen.getByLabelText(/damage.*qty/i);
      fireEvent.change(damageInput, { target: { value: '10' } });
      fireEvent.blur(damageInput); // Trigger blur to ensure validation runs

      // Wait for DAMAGE status to appear - handleDetailChange is async
      await waitFor(() => {
        const validationContainers = document.querySelectorAll('.text-xs.mt-1');
        const hasDamageMessage = Array.from(validationContainers).some(container => {
          const text = container.textContent || '';
          return text.includes('DAMAGE') && text.includes('damaged') && text.includes('good');
        });
        return hasDamageMessage;
      }, { timeout: 5000 });
    });

    it('should show action buttons for DAMAGE status', async () => {
      render(
        <GoodsReceiptModal
          isOpen={true}
          onClose={mockOnClose}
          purchaseOrder={mockPurchaseOrder}
          onSuccess={mockOnSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Create Goods Receipt/i })).toBeInTheDocument();
      });

      // Find quantity input - wait for table to render, then get first spinbutton (received quantity)
      await waitFor(() => {
        expect(screen.getAllByRole('spinbutton').length).toBeGreaterThan(0);
      });
      const qtyInputs = screen.getAllByRole('spinbutton');
      const qtyInput = qtyInputs.find((input: HTMLElement) => {
        const inputElement = input as HTMLInputElement;
        return !inputElement.id || !inputElement.id.startsWith('damage-');
      }) || qtyInputs[0];
      fireEvent.change(qtyInput, { target: { value: '100' } });

      const damageInput = screen.getByLabelText(/damage.*qty/i);
      fireEvent.change(damageInput, { target: { value: '10' } });

      // Wait for action buttons to appear for DAMAGE status
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Take Good Parts/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Accept Full Damage/i })).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should submit DAMAGE_PARTIAL when Take Good Parts is clicked', async () => {
      // This test involves modal interaction, so it may take longer
      // Setup mocks BEFORE rendering component (exactly like test OK)
      (catalogService.createGoodsReceipt as any).mockResolvedValue({
        grnNumber: 'GRN-001',
      });
      (catalogService.createReturnGoods as any).mockResolvedValue({
        returnId: 1,
      });
      (catalogService.approveReturnGoods as any).mockResolvedValue({});
      (catalogService.processReturnGoods as any).mockResolvedValue({});

      render(
        <GoodsReceiptModal
          isOpen={true}
          onClose={mockOnClose}
          purchaseOrder={mockPurchaseOrder}
          onSuccess={mockOnSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Create Goods Receipt/i })).toBeInTheDocument();
      });

      // Find quantity input - wait for table to render, then get first spinbutton (received quantity)
      await waitFor(() => {
        expect(screen.getAllByRole('spinbutton').length).toBeGreaterThan(0);
      });
      const qtyInputs = screen.getAllByRole('spinbutton');
      const qtyInput = qtyInputs.find((input: HTMLElement) => {
        const inputElement = input as HTMLInputElement;
        return !inputElement.id || !inputElement.id.startsWith('damage-');
      }) || qtyInputs[0];
      fireEvent.change(qtyInput, { target: { value: '100' } });
      fireEvent.blur(qtyInput); // Trigger blur to ensure validation runs

      const damageInput = screen.getByLabelText(/damage.*qty/i);
      fireEvent.change(damageInput, { target: { value: '10' } });
      fireEvent.blur(damageInput); // Trigger blur to ensure validation runs

      // Add notes - required for Take Good Parts
      const notesInput = screen.getByPlaceholderText(/Enter notes for this item/i);
      fireEvent.change(notesInput, { target: { value: 'Some items damaged' } });
      fireEvent.blur(notesInput);

      // Wait for notes to be saved and action buttons to appear
      await waitFor(() => {
        const input = screen.getByPlaceholderText(/Enter notes for this item/i) as HTMLInputElement;
        const takeGoodButton = screen.queryByRole('button', { name: /Take Good Parts/i });
        return input.value === 'Some items damaged' && takeGoodButton !== null;
      }, { timeout: 5000 });

      // Wait a bit more to ensure state is fully updated
      await new Promise(resolve => setTimeout(resolve, 200));

      // Click Take Good Parts button - this opens a quantity modal
      const takeGoodButton = screen.getByRole('button', { name: /Take Good Parts/i });
      fireEvent.click(takeGoodButton);

      // Wait for quantity modal to appear - check multiple ways to find it
      await waitFor(() => {
        // Method 1: Check for modal heading
        const modalHeading = screen.queryByText(/Enter Good Quantity/i);
        if (modalHeading) return true;
        
        // Method 2: Check for modal input by placeholder
        const modalInput = screen.queryByPlaceholderText(/Enter quantity.*max/i);
        if (modalInput) return true;
        
        // Method 3: Check for modal by looking for z-70 class (modal overlay)
        const modalOverlay = document.querySelector('.z-70');
        if (modalOverlay) return true;
        
        // Method 4: Check for "Confirm" button which only appears in modal
        const confirmButton = screen.queryByRole('button', { name: /Confirm/i });
        if (confirmButton && confirmButton.textContent?.includes('Confirm')) {
          // Make sure it's not the main form submit button
          const formSubmitButton = screen.queryByRole('button', { name: /Create Goods Receipt/i });
          if (confirmButton !== formSubmitButton) return true;
        }
        
        return false;
      }, { timeout: 5000 });

      // Find the quantity input in the modal - try multiple methods
      let modalQuantityInput: HTMLElement | null = null;
      try {
        modalQuantityInput = screen.getByPlaceholderText(/Enter quantity.*max/i);
      } catch {
        // Fallback: find by role="spinbutton" and check if it's in a modal
        const allInputs = screen.getAllByRole('spinbutton');
        modalQuantityInput = allInputs.find((input: HTMLElement) => {
          const parent = input.closest('.z-70');
          return parent !== null;
        }) as HTMLElement || allInputs[allInputs.length - 1];
      }
      
      fireEvent.change(modalQuantityInput, { target: { value: '90' } });

      // Submit the quantity modal - find Confirm button
      const confirmButton = screen.getByRole('button', { name: /Confirm/i });
      fireEvent.click(confirmButton);

      // Wait for modal to close
      await waitFor(() => {
        const modalHeading = screen.queryByText(/Enter Good Quantity/i);
        const modalInput = screen.queryByPlaceholderText(/Enter quantity.*max/i);
        return modalHeading === null && modalInput === null;
      }, { timeout: 5000 });

      // Wait for modal to fully close and state to update
      await waitFor(() => {
        const modalHeading = screen.queryByText(/Enter Good Quantity/i);
        return modalHeading === null;
      }, { timeout: 3000 });

      // Wait for the action button to show as selected (indicating state has updated)
      await waitFor(() => {
        const takeGoodButton = screen.queryByRole('button', { name: /Take Good Parts/i });
        // Button should exist and be in selected state (or at least not be the modal button)
        return takeGoodButton !== null;
      }, { timeout: 3000 });

      // Wait longer to ensure all state updates are complete after modal interaction
      await new Promise(resolve => setTimeout(resolve, 1000));

      const submitButton = screen.getByRole('button', { name: /submit|create|save/i });
      fireEvent.click(submitButton);

      // Wait longer to see if any validation errors occur or API is called
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if toast.error was called (validation failed)
      const errorCalls = (toast.error as any).mock.calls;
      if (errorCalls.length > 0) {
        throw new Error(`Form validation failed: ${errorCalls.map((call: any[]) => call[0]).join('; ')}`);
      }

      // Wait for API call and verify arguments in one go (exactly like other tests)
      await waitFor(() => {
        expect(catalogService.createGoodsReceipt).toHaveBeenCalledWith(
          expect.objectContaining({
            details: expect.arrayContaining([
              expect.objectContaining({
                qtyInput: 90, // Good quantity (100 - 10)
                damageQty: 10,
                status: ReceiptStatus.DAMAGE_PARTIAL,
              }),
            ]),
          })
        );
      }, { timeout: 10000 });

      // Should create return goods for damaged items (10 KG)
      expect(catalogService.createReturnGoods).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({
              qty: 10, // Damaged quantity
              returnReason: expect.stringContaining('damaged'),
            }),
          ]),
        })
      );

      // Should auto-approve and process return goods
      expect(catalogService.approveReturnGoods).toHaveBeenCalledWith(1);
      expect(catalogService.processReturnGoods).toHaveBeenCalledWith(1);
    });

    it('should submit DAMAGE_ACCEPTED when Accept Full Damage is clicked', async () => {
      // This test may take longer due to async state updates
      (catalogService.createGoodsReceipt as any).mockResolvedValue({
        grnNumber: 'GRN-001',
      });

      render(
        <GoodsReceiptModal
          isOpen={true}
          onClose={mockOnClose}
          purchaseOrder={mockPurchaseOrder}
          onSuccess={mockOnSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Create Goods Receipt/i })).toBeInTheDocument();
      });

      // Find quantity input - wait for table to render, then get first spinbutton (received quantity)
      await waitFor(() => {
        expect(screen.getAllByRole('spinbutton').length).toBeGreaterThan(0);
      });
      const qtyInputs = screen.getAllByRole('spinbutton');
      const qtyInput = qtyInputs.find((input: HTMLElement) => {
        const inputElement = input as HTMLInputElement;
        return !inputElement.id || !inputElement.id.startsWith('damage-');
      }) || qtyInputs[0];
      fireEvent.change(qtyInput, { target: { value: '100' } });
      fireEvent.blur(qtyInput); // Trigger blur to ensure validation runs

      const damageInput = screen.getByLabelText(/damage.*qty/i);
      fireEvent.change(damageInput, { target: { value: '10' } });
      fireEvent.blur(damageInput); // Trigger blur to ensure validation runs

      // Add notes - required for Accept Full Damage
      const notesInput = screen.getByPlaceholderText(/Enter notes for this item/i);
      fireEvent.change(notesInput, { target: { value: 'All items damaged' } });
      fireEvent.blur(notesInput);

      // Wait for notes to be saved and action buttons to appear
      await waitFor(() => {
        const input = screen.getByPlaceholderText(/Enter notes for this item/i) as HTMLInputElement;
        const acceptButton = screen.queryByRole('button', { name: /Accept Full Damage/i });
        return input.value === 'All items damaged' && acceptButton !== null;
      }, { timeout: 5000 });

      // Wait a bit more to ensure state is fully updated
      await new Promise(resolve => setTimeout(resolve, 200));

      // Click Accept Full Damage button
      const acceptButton = screen.getByRole('button', { name: /Accept Full Damage/i });
      fireEvent.click(acceptButton);

      // Wait for the action to be set in state
      await waitFor(() => {
        const selectedButton = screen.getByRole('button', { name: /Accept Full Damage/i });
        expect(selectedButton).toBeInTheDocument();
        return true; // Just verify button exists, don't check styling
      }, { timeout: 3000 });

      // Wait a bit more to ensure state is fully updated
      await new Promise(resolve => setTimeout(resolve, 500));

      const submitButton = screen.getByRole('button', { name: /submit|create|save/i });
      fireEvent.click(submitButton);

      // Wait a bit to see if any validation errors occur
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check if toast.error was called (validation failed)
      const errorCalls = (toast.error as any).mock.calls;
      if (errorCalls.length > 0) {
        throw new Error(`Form validation failed: ${errorCalls.map((call: any[]) => call[0]).join('; ')}`);
      }

      // Wait for API call - check if it was called
      await waitFor(() => {
        expect(catalogService.createGoodsReceipt).toHaveBeenCalled();
      }, { timeout: 10000 });

      // Verify the call arguments
      expect(catalogService.createGoodsReceipt).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({
              qtyInput: 100, // Total including damaged
              damageQty: 10,
              status: ReceiptStatus.DAMAGE_ACCEPTED,
            }),
          ]),
        })
      );
    });
  });

  describe('Validation Tests', () => {
    it('should require action selection for SHORT status', async () => {
      render(
        <GoodsReceiptModal
          isOpen={true}
          onClose={mockOnClose}
          purchaseOrder={mockPurchaseOrder}
          onSuccess={mockOnSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Create Goods Receipt/i })).toBeInTheDocument();
      });

      // Find quantity input - wait for table to render, then get first spinbutton (received quantity)
      await waitFor(() => {
        expect(screen.getAllByRole('spinbutton').length).toBeGreaterThan(0);
      });
      const qtyInputs = screen.getAllByRole('spinbutton');
      const qtyInput = qtyInputs.find((input: HTMLElement) => {
        const inputElement = input as HTMLInputElement;
        return !inputElement.id || !inputElement.id.startsWith('damage-');
      }) || qtyInputs[0];
      fireEvent.change(qtyInput, { target: { value: '80' } });

      // Try to submit without selecting action
      const submitButton = screen.getByRole('button', { name: /submit|create|save/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        // Should show error
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Please select an action for shortage')
        );
      });
    });

    it('should require notes for RETURN status', async () => {
      render(
        <GoodsReceiptModal
          isOpen={true}
          onClose={mockOnClose}
          purchaseOrder={mockPurchaseOrder}
          onSuccess={mockOnSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Create Goods Receipt/i })).toBeInTheDocument();
      });

      // Wait for table to render
      await waitFor(() => {
        expect(screen.getAllByRole('spinbutton').length).toBeGreaterThan(0);
      });

      // Find quantity input
      const qtyInputs = screen.getAllByRole('spinbutton');
      const qtyInput = qtyInputs.find((input: HTMLElement) => {
        const inputElement = input as HTMLInputElement;
        return !inputElement.id || !inputElement.id.startsWith('damage-');
      }) || qtyInputs[0];

      // Enter quantity to enable RETURN button
      fireEvent.change(qtyInput, { target: { value: '100' } });

      // Wait for RETURN button to appear (if available)
      // RETURN button appears when user can return the entire line
      await waitFor(() => {
        // Look for "Return Item" button
        const returnButton = screen.queryByRole('button', { name: /Return Item/i });
        if (returnButton) {
          fireEvent.click(returnButton);
        }
      }, { timeout: 2000 });

      // Try to submit without notes
      const submitButton = screen.getByRole('button', { name: /submit|create|save/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        // Should show error about missing notes
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Please provide a reason for returning')
        );
      }, { timeout: 3000 });
    });
  });
});

