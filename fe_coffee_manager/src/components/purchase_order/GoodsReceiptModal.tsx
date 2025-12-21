import React, { useState, useEffect, useMemo } from 'react';
import { X, Package, CheckCircle, AlertTriangle, Package2, AlertCircle, RotateCcw, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { catalogService } from '../../services/catalogService';
import { ReceiptStatus, ReceiptStatusMessage, ReceiptStatusLabels } from '../../types/receiptStatus';
import { useAuth } from '../../context/AuthContext';

// Quantity Input Modal Component
interface QuantityInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (quantity: number) => void;
  data: {
    index: number;
    maxQty: number;
    currentQty: number;
    title: string;
  };
}

const QuantityInputModal: React.FC<QuantityInputModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  data
}) => {
  const [quantity, setQuantity] = useState(data.currentQty.toString());

  useEffect(() => {
    if (isOpen) {
      setQuantity(data.currentQty.toString());
    }
  }, [isOpen, data.currentQty]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedQty = parseFloat(quantity);
    if (isNaN(parsedQty) || parsedQty < 0 || parsedQty > data.maxQty) {
      toast.error(`Invalid quantity. Please enter a number between 0 and ${data.maxQty}`);
      return;
    }
    onSubmit(parsedQty);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-70">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{data.title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter Quantity
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                max={data.maxQty}
                step="0.01"
                placeholder={`Enter quantity (max: ${data.maxQty})`}
                autoFocus
              />
              <div className="text-xs text-gray-500 mt-1">
                Maximum: {data.maxQty}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface GoodsReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: any;
  onSuccess: () => void; // Commented out for debugging
}

interface GoodsReceiptDetail {
  poDetailId: number;
  ingredient: {
    ingredientId: number;
    name: string;
  };
  unitCode: string;
  orderedQty: number;
  receivedQty: number;
  receivedUnitCode: string;
  unitPrice: number;
  lineTotal: number;
  mfgDate: string;
  expDate: string;
  notes: string;
  damageQty: number; // Add damage quantity field
  lotNumber: string; // Add lot number field
  conversionError?: string;
  convertedQty?: number;
  showCreateConversion?: boolean;
  quantityValidation?: {
    status: ReceiptStatus;
    message: string;
  };
}

const GoodsReceiptModal: React.FC<GoodsReceiptModalProps> = ({
  isOpen,
  onClose,
  purchaseOrder,
  onSuccess // eslint-disable-line @typescript-eslint/no-unused-vars
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    grnNumber: '',
    receivedAt: new Date().toISOString().slice(0, 16),
    notes: '',
    status: 'COMPLETED'
  });

  // Handle modal close with reset
  const handleModalClose = () => {
    // Reset selected actions when modal closes
    setSelectedActions({});
    onClose();
  };

  const [details, setDetails] = useState<GoodsReceiptDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState<any[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [receiptStatusesLoading, setReceiptStatusesLoading] = useState(false);
  const [showCreateConversionModal, setShowCreateConversionModal] = useState(false);
  const [conversionData, setConversionData] = useState<{
    ingredientId: number;
    ingredientName: string;
    fromUnit: string;
    toUnit: string;
    factor: number;
  } | null>(null);
  const [selectedActions, setSelectedActions] = useState<{[key: number]: string}>({});
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [quantityModalData, setQuantityModalData] = useState<{
    index: number;
    maxQty: number;
    currentQty: number;
    title: string;
  } | null>(null);
  
  // State to track receipt status for each PO detail
  const [receiptStatuses, setReceiptStatuses] = useState<{[key: number]: {
    receivedQty: number;
    status: string;
    remainingQty: number;
    canReceiveMore: boolean;
    lastReceiptStatus: string;
    receiptMessage: string;
  }}>({});

  // Map by poDetailId to avoid index mismatches when filtering
  const [receiptStatusesById, setReceiptStatusesById] = useState<Record<number, {
    receivedQty: number;
    status: string;
    remainingQty: number;
    canReceiveMore: boolean;
    lastReceiptStatus: string;
    receiptMessage: string;
  }>>({});

  const loadUnits = async () => {
    try {
      setUnitsLoading(true);
      const response = await catalogService.getUnits();
      setUnits(response);
    } catch (error) {
      console.error('Error loading units:', error);
      toast.error('Failed to load units');
    } finally {
      setUnitsLoading(false);
    }
  };

  // Load receipt status for each PO detail from API
  const loadReceiptStatuses = async () => {
    if (!purchaseOrder) return;
    
    setReceiptStatusesLoading(true);
    try {
      // Call the new API endpoint to get receipt statuses
      const response = await catalogService.getPoDetailReceiptStatuses(purchaseOrder.poId);
      
      const statuses: {[key: number]: {
        receivedQty: number;
        status: string;
        remainingQty: number;
        canReceiveMore: boolean;
        lastReceiptStatus: string;
        receiptMessage: string;
      }} = {};
      const byId: Record<number, {
        receivedQty: number;
        status: string;
        remainingQty: number;
        canReceiveMore: boolean;
        lastReceiptStatus: string;
        receiptMessage: string;
      }> = {};
      
      // Map API response to our state format
      // Note: API only returns statuses for PO details that have actual receipt records
      response.forEach((status: any) => {
        // Find the index of this PO detail in the purchase order details
        // Try both poDetailId and id fields
        const poDetailIndex = purchaseOrder.details.findIndex((detail: any) => 
          detail.poDetailId === status.poDetailId || detail.id === status.poDetailId
        );
        
        if (poDetailIndex !== -1) {
          const mapped = {
            receivedQty: status.receivedQty,
            status: status.status,
            remainingQty: status.remainingQty,
            canReceiveMore: status.canReceiveMore,
            lastReceiptStatus: status.lastReceiptStatus,
            receiptMessage: status.receiptMessage
          };
          statuses[poDetailIndex] = mapped;
          const poDetail = purchaseOrder.details[poDetailIndex];
          const idKey = poDetail.poDetailId ?? poDetail.id;
          if (idKey !== undefined) byId[idKey] = mapped;
        }
      });
      
      setReceiptStatuses(statuses);
      setReceiptStatusesById(byId);
    } catch (error: any) {
      console.error('Error loading receipt statuses:', error);
      // If API fails, don't show any receipt status (no records exist yet)
      setReceiptStatuses({});
      setReceiptStatusesById({});
    } finally {
      setReceiptStatusesLoading(false);
    }
  };


  useEffect(() => {
    if (isOpen && purchaseOrder) {
      const initializeModal = async () => {
        // Reset ALL state when modal opens
        setSelectedActions({});
        setDetails([]);
        setReceiptStatuses([]);
        setUnits([]);
        setLoading(false);
        setReceiptStatusesLoading(false);
        
        // Load units when modal opens
        loadUnits();
        
        // Load receipt statuses FIRST to determine which items to show
        await loadReceiptStatuses();
        
         // Initialize details from PO details
         const initialDetails = purchaseOrder.details.map((detail: any, index: number) => {
         
         // Generate lot number automatically
         const currentDate = new Date();
         const dateStr = currentDate.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
         const timeStr = currentDate.toTimeString().slice(0, 8).replace(/:/g, ''); // HHMMSS
         const autoLotNumber = `LOT-${dateStr}-${timeStr}-${String(index + 1).padStart(3, '0')}`;
         
         const newDetail = {
           poDetailId: detail.id,
           ingredient: detail.ingredient,
           unitCode: detail.unitCode,
           orderedQty: detail.qty,
           receivedQty: detail.qty, // Default to ordered quantity
           receivedUnitCode: detail.unitCode, // Default to same unit
           unitPrice: detail.ingredient?.unitPrice || 0, // Use ingredient's standard unit price
           lineTotal: detail.qty * (detail.ingredient?.unitPrice || 0), // Calculate with standard price
           mfgDate: '',
           expDate: '',
           notes: '',
           damageQty: 0, // Initialize damage quantity to 0
           lotNumber: autoLotNumber // Auto-generate lot number
         };
         return newDetail;
       });
      
      // Add initial validation
      const detailsWithValidation = initialDetails.map((detail: any) => {
        const validation = validateQuantity(detail);
        return { ...detail, quantityValidation: validation };
      });
      
      setDetails(detailsWithValidation);

      // Generate GRN number
      const grnNumber = `GRN-${purchaseOrder.poNumber}-${Date.now()}`;
      setFormData(prev => ({ ...prev, grnNumber }));
      };
      
      initializeModal();
    }
  }, [isOpen, purchaseOrder]);


  // Filter out items that cannot receive more (already processed)
  const filteredDetails = useMemo(() => {
    if (details.length === 0) {
      return details;
    }
    
    // If still loading receipt statuses, show all items (avoid flash)
    if (receiptStatusesLoading) {
      return details;
    }
    
    // If no receipt statuses (empty array from API), show all items (new PO)
    if (Object.keys(receiptStatusesById).length === 0) {
      return details;
    }
    
    // If has receipt statuses, only show items that can receive more
    return details.filter((detail) => {
      const idKey = detail.poDetailId ?? (detail as any).id;
      const receiptStatus = idKey !== undefined ? receiptStatusesById[idKey] : undefined;
      return receiptStatus && receiptStatus.canReceiveMore === true;
    });
  }, [details, receiptStatusesById, receiptStatusesLoading]);

  // Create a mapping from filtered index to original index for receipt statuses
  const getOriginalIndex = (filteredIndex: number) => filteredIndex;

  const validateUnitConversion = async (ingredientId: number, fromUnit: string, toUnit: string, quantity: number) => {
    try {
      // Get branchId from user context
      const currentBranchId = user?.branchId ? Number(user.branchId) : null;
      
      return await catalogService.validateUnitConversion({
        ingredientId,
        fromUnitCode: fromUnit,
        toUnitCode: toUnit,
        quantity,
        branchId: currentBranchId || undefined // Convert null to undefined
      });
    } catch (error) {
      console.error('Unit conversion validation error:', error);
      return { canConvert: false, errorMessage: 'Failed to validate unit conversion' };
    }
  };

  const validateQuantity = (detail: GoodsReceiptDetail): { status: ReceiptStatus; message: string } => {
    const EPSILON = 1e-6;
    // Use receipt status by poDetailId to get remaining quantity (if any)
    const idKey = detail.poDetailId ?? (detail as any).id;
    const receiptStatus = idKey !== undefined ? receiptStatusesById[idKey] : undefined;
    const hasRemaining = receiptStatus && typeof receiptStatus.remainingQty === 'number';
    const targetQty = hasRemaining ? receiptStatus!.remainingQty : detail.orderedQty;
    
    if (detail.receivedUnitCode === detail.unitCode) {
      // Same unit - direct comparison
      const receivedQty = detail.receivedQty;
      
      if (receivedQty - targetQty > EPSILON) {
        return { status: ReceiptStatus.OVER, message: `Received ${receivedQty} > ${receiptStatus?.remainingQty !== undefined ? 'Remaining' : 'Ordered'} ${targetQty}` };
      } else if (targetQty - receivedQty > EPSILON) {
        return { status: ReceiptStatus.SHORT, message: `Received ${receivedQty} < ${receiptStatus?.remainingQty !== undefined ? 'Remaining' : 'Ordered'} ${targetQty}` };
      } else {
        return { status: ReceiptStatus.OK, message: `Received ${receivedQty} = ${receiptStatus?.remainingQty !== undefined ? 'Remaining' : 'Ordered'} ${targetQty}` };
      }
    } else {
      // Different units - need conversion
      if (detail.convertedQty !== undefined) {
        const receivedQty = detail.convertedQty;
        
        if (receivedQty - targetQty > EPSILON) {
          return { status: ReceiptStatus.OVER, message: `Received ${detail.receivedQty} ${detail.receivedUnitCode} (${receivedQty.toFixed(4)} ${detail.unitCode}) > ${hasRemaining ? 'Remaining' : 'Ordered'} ${targetQty} ${detail.unitCode}` };
        } else if (targetQty - receivedQty > EPSILON) {
          return { status: ReceiptStatus.SHORT, message: `Received ${detail.receivedQty} ${detail.receivedUnitCode} (${receivedQty.toFixed(4)} ${detail.unitCode}) < ${hasRemaining ? 'Remaining' : 'Ordered'} ${targetQty} ${detail.unitCode}` };
        } else {
          return { status: ReceiptStatus.OK, message: `Received ${detail.receivedQty} ${detail.receivedUnitCode} (${receivedQty.toFixed(4)} ${detail.unitCode}) = ${hasRemaining ? 'Remaining' : 'Ordered'} ${targetQty} ${detail.unitCode}` };
        }
      } else {
        return { status: ReceiptStatus.RETURN, message: 'Cannot compare - conversion failed' };
      }
    }
  };


  const validateQuantityWithDamage = (detail: GoodsReceiptDetail): { status: ReceiptStatus; message: string } => {
    const orderedQty = detail.orderedQty;
    const receivedQty = detail.receivedQty;
    const damageQty = detail.damageQty || 0;
    const goodQty = receivedQty - damageQty;
    
    // Validate damage quantity
    if (damageQty < 0) {
      return { status: ReceiptStatus.DAMAGE, message: `DAMAGE: Invalid damage quantity (${damageQty})` };
    }
    
    if (damageQty > receivedQty) {
      return { status: ReceiptStatus.DAMAGE, message: `DAMAGE: Damage quantity (${damageQty}) cannot exceed received quantity (${receivedQty})` };
    }
    
    // If there's damage, show validation but don't auto-set status
    if (damageQty > 0) {
      if (goodQty < 0) {
        return { status: ReceiptStatus.DAMAGE, message: `DAMAGE: ${damageQty} damaged, ${goodQty} good (invalid)` };
      } else if (goodQty === 0) {
        return { status: ReceiptStatus.DAMAGE, message: `DAMAGE: All ${damageQty} items damaged - Choose action below` };
      } else {
        // There's damage but also good items - show options
        if (goodQty < orderedQty) {
          return { status: ReceiptStatus.DAMAGE, message: `DAMAGE + SHORT: ${damageQty} damaged, ${goodQty} good (${orderedQty - goodQty} short) - Choose action below` };
        } else if (goodQty > orderedQty) {
          return { status: ReceiptStatus.DAMAGE, message: `DAMAGE + OVER: ${damageQty} damaged, ${goodQty} good (${goodQty - orderedQty} extra) - Choose action below` };
        } else {
          return { status: ReceiptStatus.DAMAGE, message: `DAMAGE: ${damageQty} damaged, ${goodQty} good items - Choose action below` };
        }
      }
    }
    
    // If no damage, use normal validation
    return validateQuantity(detail);
  };

  const handleDetailChange = async (index: number, field: keyof GoodsReceiptDetail, value: any) => {
    const newDetails = [...details];
    newDetails[index] = { ...newDetails[index], [field]: value };
    
    // Track selected action for visual feedback
    if (field === 'quantityValidation' && value && value.status) {
      setSelectedActions(prev => ({
        ...prev,
        [index]: value.status
      }));
    }
    
     // If unit changed, validate conversion
     if (field === 'receivedUnitCode' && value !== newDetails[index].unitCode) {
       const conversion = await validateUnitConversion(
         newDetails[index].ingredient.ingredientId,
         value, // fromUnit: received unit (g)
         newDetails[index].unitCode, // toUnit: ordered unit (kg)
         newDetails[index].receivedQty
       );
       
       if (conversion.canConvert) {
         newDetails[index].convertedQty = conversion.convertedQuantity;
         newDetails[index].conversionError = undefined;
         newDetails[index].showCreateConversion = false;
         
         // Recalculate line total with converted quantity
         newDetails[index].lineTotal = conversion.convertedQuantity * newDetails[index].unitPrice;
       } else {
         newDetails[index].conversionError = conversion.errorMessage;
         newDetails[index].convertedQty = undefined;
         newDetails[index].showCreateConversion = true;
         
         // Use received quantity if conversion fails
         newDetails[index].lineTotal = newDetails[index].receivedQty * newDetails[index].unitPrice;
       }
     }
    
     // Recalculate line total if quantity changes
     if (field === 'receivedQty') {
       // If unit is different, validate conversion with new quantity
       if (newDetails[index].receivedUnitCode !== newDetails[index].unitCode) {
         const conversion = await validateUnitConversion(
           newDetails[index].ingredient.ingredientId,
           newDetails[index].receivedUnitCode, // fromUnit: received unit
           newDetails[index].unitCode, // toUnit: ordered unit
           newDetails[index].receivedQty
         );

         
         if (conversion.canConvert) {
           newDetails[index].convertedQty = conversion.convertedQuantity;
           newDetails[index].conversionError = undefined;
           newDetails[index].showCreateConversion = false;
         } else {
           newDetails[index].conversionError = conversion.errorMessage;
           newDetails[index].convertedQty = undefined;
           newDetails[index].showCreateConversion = true;
         }
       }
       
       // Use converted quantity if available, otherwise use received quantity
       const quantityForCalculation = newDetails[index].convertedQty !== undefined 
         ? newDetails[index].convertedQty 
         : newDetails[index].receivedQty;
       newDetails[index].lineTotal = quantityForCalculation * newDetails[index].unitPrice;
     }
    
    // Validate quantity comparison after any change
    const validation = validateQuantityWithDamage(newDetails[index]);
    
    // Only update quantityValidation if user hasn't selected a specific action
    const currentStatus = newDetails[index].quantityValidation?.status;
    const isUserSelectedStatus = currentStatus && (
      currentStatus === ReceiptStatus.SHORT_ACCEPTED ||
      currentStatus === ReceiptStatus.SHORT_PENDING ||
      currentStatus === ReceiptStatus.OVER_ACCEPTED ||
      currentStatus === ReceiptStatus.OVER_ADJUSTED ||
      currentStatus === ReceiptStatus.OVER_RETURN ||
      currentStatus === ReceiptStatus.DAMAGE_ACCEPTED ||
      currentStatus === ReceiptStatus.DAMAGE_RETURN ||
      currentStatus === ReceiptStatus.DAMAGE_PARTIAL ||
      currentStatus === ReceiptStatus.RETURN
    );
    
    if (!isUserSelectedStatus) {
      newDetails[index].quantityValidation = validation;
    }
    
    setDetails(newDetails);
  };

  const handleCreateConversion = (index: number) => {
    const detail = details[index];
    setConversionData({
      ingredientId: detail.ingredient.ingredientId,
      ingredientName: detail.ingredient?.name || 'Unknown Ingredient',
      fromUnit: detail.unitCode,
      toUnit: detail.receivedUnitCode,
      factor: 1 // Default factor, user can change
    });
    setShowCreateConversionModal(true);
  };

  const handleSaveConversion = async () => {
    if (!conversionData) return;

    try {
      // Get current branch ID from user context
      const currentBranchId = user?.branchId ? Number(user.branchId) : null;
      
      await catalogService.createUnitConversion({
        ingredientId: conversionData.ingredientId,
        fromUnitCode: conversionData.fromUnit,
        toUnitCode: conversionData.toUnit,
        factor: conversionData.factor,
        description: `Conversion from ${conversionData.fromUnit} to ${conversionData.toUnit}`,
        scope: 'BRANCH', // Manager can only create BRANCH-specific rules
        branchId: currentBranchId // Use current branch ID
      });

      toast.success('Unit conversion created successfully');
      setShowCreateConversionModal(false);
      setConversionData(null);

      // Re-validate the conversion
      const index = details.findIndex(d => d.ingredient.ingredientId === conversionData.ingredientId);
      if (index !== -1) {
        await handleDetailChange(getOriginalIndex(index), 'receivedUnitCode', details[index].receivedUnitCode);
      }
    } catch (error: any) {
      console.error('Error creating conversion:', error);
      toast.error(error.message || 'Failed to create unit conversion');
    }
  };

  const handleQuantityModalSubmit = (quantity: number) => {
    if (!quantityModalData) return;

    const { index, maxQty } = quantityModalData;
    const detail = details[index];

    console.log('[DEBUG handleQuantityModalSubmit] Input:', {
      quantity,
      index,
      maxQty,
      currentDetail: {
        receivedQty: detail.receivedQty,
        damageQty: detail.damageQty,
        orderedQty: detail.orderedQty,
        quantityValidation: detail.quantityValidation
      }
    });

    if (quantity < 0 || quantity > maxQty) {
      toast.error(`Invalid quantity. Please enter a number between 0 and ${maxQty}`);
      return;
    }

    // Update the detail with new quantity
    const newDetails = [...details];
    const newReceivedQty = quantity + detail.damageQty;
    newDetails[index] = { 
      ...newDetails[index], 
      receivedQty: newReceivedQty, // Add damage back to get total received
      quantityValidation: {
        status: ReceiptStatus.DAMAGE_PARTIAL,
        message: `${ReceiptStatusMessage.PARTIAL_DAMAGE_ACCEPTED}: Received ${quantity} good items out of ${detail.orderedQty} ordered. ${detail.notes}`
      }
    };

    console.log('[DEBUG handleQuantityModalSubmit] Updated detail:', {
      receivedQty: newReceivedQty,
      damageQty: detail.damageQty,
      quantityValidation: newDetails[index].quantityValidation,
      selectedAction: 'DAMAGE_PARTIAL'
    });

    setDetails(newDetails);
    setSelectedActions(prev => ({
      ...prev,
      [index]: 'DAMAGE_PARTIAL'
    }));

    setShowQuantityModal(false);
    setQuantityModalData(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate all details before submission
      const conversionErrors = [];
      for (const detail of details) {
        // Skip items that cannot receive more (already processed)
        const idKeyForCheck = detail.poDetailId ?? (detail as any).id;
        if (Object.keys(receiptStatusesById).length > 0 && idKeyForCheck !== undefined && receiptStatusesById[idKeyForCheck]?.canReceiveMore === false) {
          continue;
        }
        if (detail.receivedUnitCode !== detail.unitCode && detail.convertedQty === undefined) {
          conversionErrors.push(`${detail.ingredient?.name || 'Unknown Ingredient'}: Cannot convert ${detail.receivedQty} ${detail.receivedUnitCode} to ${detail.unitCode}`);
        }
      }
      
      if (conversionErrors.length > 0) {
        throw new Error(`Unit conversion errors:\n${conversionErrors.join('\n')}\n\nPlease create unit conversion rules or use the same units.`);
      }

      // Validate RETURN items - must have notes
      const returnErrors = [];
      for (const detail of details) {
        // Skip items that cannot receive more (already processed)
        const idKeyForCheck = detail.poDetailId ?? (detail as any).id;
        if (Object.keys(receiptStatusesById).length > 0 && idKeyForCheck !== undefined && receiptStatusesById[idKeyForCheck]?.canReceiveMore === false) {
          continue;
        }
        if (detail.quantityValidation?.status === 'RETURN') {
          if (!detail.notes || detail.notes.trim() === '') {
            returnErrors.push(`${detail.ingredient?.name || 'Unknown Ingredient'}: Please provide a reason for returning this item`);
          }
        }
      }
      
      if (returnErrors.length > 0) {
        throw new Error(`Return validation errors:\n${returnErrors.join('\n')}\n\nNotes are required for all returned items.`);
      }
      
      // Validate that action buttons are selected for problematic items
      const actionValidationErrors = [];
      for (const detail of details) {
        // Skip items that cannot receive more (already processed)
        const idKeyForCheck = detail.poDetailId ?? (detail as any).id;
        if (Object.keys(receiptStatusesById).length > 0 && idKeyForCheck !== undefined && receiptStatusesById[idKeyForCheck]?.canReceiveMore === false) {
          continue;
        }
        
        // Check if user has already selected a specific action status
        const hasUserSelectedStatus = detail.quantityValidation?.status && (
          detail.quantityValidation.status === ReceiptStatus.SHORT_ACCEPTED ||
          detail.quantityValidation.status === ReceiptStatus.SHORT_PENDING ||
          detail.quantityValidation.status === ReceiptStatus.OVER_ACCEPTED ||
          detail.quantityValidation.status === ReceiptStatus.OVER_ADJUSTED ||
          detail.quantityValidation.status === ReceiptStatus.OVER_RETURN ||
          detail.quantityValidation.status === ReceiptStatus.DAMAGE_ACCEPTED ||
          detail.quantityValidation.status === ReceiptStatus.DAMAGE_RETURN ||
          detail.quantityValidation.status === ReceiptStatus.DAMAGE_PARTIAL ||
          detail.quantityValidation.status === ReceiptStatus.RETURN
        );
        
        // If user has already selected a status, skip validation
        if (hasUserSelectedStatus) {
          continue;
        }
        
        const validation = validateQuantityWithDamage(detail);
        
        // Check if item has issues (SHORT, OVER, DAMAGE) but no action selected
        // Use selectedActions as fallback check
        const detailIndex = details.indexOf(detail);
        const hasSelectedAction = selectedActions[detailIndex];
        
        if (validation.status === ReceiptStatus.SHORT && !hasSelectedAction) {
          actionValidationErrors.push(`${detail.ingredient?.name || 'Unknown Ingredient'}: Please select an action for shortage (Accept Shortage or Mark for Follow-up)`);
        }
        
        if (validation.status === ReceiptStatus.OVER && !hasSelectedAction) {
          actionValidationErrors.push(`${detail.ingredient?.name || 'Unknown Ingredient'}: Please select an action for overage (Accept Overage, Adjust Order, or Return Excess)`);
        }
        
        if (validation.status === ReceiptStatus.DAMAGE && !hasSelectedAction) {
          actionValidationErrors.push(`${detail.ingredient?.name || 'Unknown Ingredient'}: Please select an action for damage (Accept Full Damage, Take Good Parts, or Return Damaged)`);
        }
      }
      
      if (actionValidationErrors.length > 0) {
        // Show each error separately
        actionValidationErrors.forEach(error => {
          toast.error(error);
        });
        return;
      }
      
      // Only check receipt statuses if they exist (i.e., there are previous goods receipts)
      const hasReceiptStatuses = Object.keys(receiptStatuses).length > 0;
      
      if (hasReceiptStatuses) {
        // Check if all items are already processed (canReceiveMore === false)
        const allProcessed = details.every((detail) => {
          const idKey = detail.poDetailId ?? (detail as any).id;
          return idKey !== undefined ? receiptStatusesById[idKey]?.canReceiveMore === false : false;
        });
        
        if (allProcessed) {
          toast.error('All items have already been processed. No new goods receipt needed.');
          return;
        }
        
        // Check if there are any items that can still receive more
        const hasReceivableItems = details.some((detail) => {
          const idKey = detail.poDetailId ?? (detail as any).id;
          return idKey !== undefined ? receiptStatusesById[idKey]?.canReceiveMore === true : true;
        });
        
        if (!hasReceivableItems) {
          toast.error('No items can receive more goods. All items have been processed.');
          return;
        }
      }
      
      // Debug logs for purchaseOrder structure
      
      // Validate required data
      if (!purchaseOrder.poId) {
        toast.error('Purchase Order ID is missing');
        return;
      }
      
      // Try to get supplierId from different possible locations
      const supplierId = purchaseOrder.supplierId || purchaseOrder.supplier?.supplierId || purchaseOrder.supplier?.id;
      if (!supplierId) {
        toast.error('Supplier ID is missing');
        return;
      }
      
      if (!purchaseOrder.branchId) {
        toast.error('Branch ID is missing');
        return;
      }

      // Track which PO detail items will be closed after this receipt
      const closedDetailIds = new Set<number>();

      // Mark already closed items from previous receipts
      Object.entries(receiptStatusesById).forEach(([idStr, st]) => {
        const idNum = Number(idStr);
        if (st && st.canReceiveMore === false) closedDetailIds.add(idNum);
      });

      console.log('[DEBUG handleSubmit] Building requestData, details count:', details.length);
      console.log('[DEBUG handleSubmit] Selected actions:', selectedActions);
      console.log('[DEBUG handleSubmit] Receipt statuses:', receiptStatusesById);

      const requestData = {
        poId: purchaseOrder.poId,
        supplierId: supplierId,
        branchId: purchaseOrder.branchId,
        receivedBy: user?.user_id || 1, // Get user ID from auth context, fallback to 1
        details: details.map((detail, detailIndex) => {
          console.log(`[DEBUG handleSubmit] Processing detail ${detailIndex}:`, {
            poDetailId: detail.poDetailId,
            receivedQty: detail.receivedQty,
            damageQty: detail.damageQty,
            orderedQty: detail.orderedQty,
            quantityValidation: detail.quantityValidation,
            receivedUnitCode: detail.receivedUnitCode,
            unitCode: detail.unitCode
          });
          // Skip items that cannot receive more (only if receipt statuses exist)
          const idKey = detail.poDetailId ?? (detail as any).id;
          if (hasReceiptStatuses && idKey !== undefined && receiptStatusesById[idKey]?.canReceiveMore === false) {
            console.log(`[DEBUG handleSubmit] Skipping detail ${detailIndex} - canReceiveMore = false`);
            return null;
          }
          // Validate detail data
          if (!detail.poDetailId) {
            throw new Error(`PO Detail ID is missing for ingredient: ${detail.ingredient?.name || 'Unknown Ingredient'}`);
          }
          if (!detail.ingredient.ingredientId) {
            throw new Error(`Ingredient ID is missing for ingredient: ${detail.ingredient?.name || 'Unknown Ingredient'}`);
          }
          if (!detail.unitCode) {
            throw new Error(`Unit code is missing for ingredient: ${detail.ingredient?.name || 'Unknown Ingredient'}`);
          }
          
          // Determine the final unit and quantity to store based on status
          let finalUnitCode = detail.receivedUnitCode;
          let finalQty = detail.receivedQty;
          let status = 'OK';
          let note = detail.notes || '';
          
          // If units are different, use converted quantity and original unit
          if (detail.receivedUnitCode !== detail.unitCode) {
            if (detail.convertedQty !== undefined) {
              // Use converted quantity with original unit
              finalUnitCode = detail.unitCode;
              finalQty = detail.convertedQty;
            } else {
              // Conversion failed - show error and prevent submission
              throw new Error(`Cannot convert ${detail.receivedQty} ${detail.receivedUnitCode} to ${detail.unitCode} for ingredient: ${detail.ingredient?.name || 'Unknown Ingredient'}. Please create a unit conversion rule or use the same unit.`);
            }
          }
          
          // Determine status based on quantity comparison with damage
          const validation = validateQuantityWithDamage(detail);
          
          // If user has already set a specific status, use that instead of validation result
          if (detail.quantityValidation?.status && 
              (detail.quantityValidation.status === ReceiptStatus.SHORT_ACCEPTED ||
               detail.quantityValidation.status === ReceiptStatus.SHORT_PENDING ||
               detail.quantityValidation.status === ReceiptStatus.OVER_ACCEPTED ||
               detail.quantityValidation.status === ReceiptStatus.OVER_ADJUSTED ||
               detail.quantityValidation.status === ReceiptStatus.OVER_RETURN ||
               detail.quantityValidation.status === ReceiptStatus.DAMAGE_ACCEPTED ||
               detail.quantityValidation.status === ReceiptStatus.DAMAGE_RETURN ||
               detail.quantityValidation.status === ReceiptStatus.DAMAGE_PARTIAL ||
               detail.quantityValidation.status === ReceiptStatus.RETURN)) {
            status = detail.quantityValidation.status;
          } else {
            status = validation.status;
          }
          
          // Pre-calc target quantity in ordered unit (remaining if exists, else ordered)
          const idKeyForTarget = detail.poDetailId ?? (detail as any).id;
          const rsForTarget = idKeyForTarget !== undefined ? receiptStatusesById[idKeyForTarget] : undefined;
          const targetQty = rsForTarget && typeof rsForTarget.remainingQty === 'number' ? rsForTarget.remainingQty : detail.orderedQty;

          // Handle different statuses with detailed status mapping
          switch (status) {
            case ReceiptStatus.SHORT:
              // Check if shortage was accepted or needs follow-up
              if (detail.quantityValidation?.status === ReceiptStatus.SHORT_ACCEPTED || 
                  detail.quantityValidation?.message?.includes(ReceiptStatusMessage.ACCEPTED_SHORTAGE)) {
                status = ReceiptStatus.SHORT_ACCEPTED;
                note = `SHORT ACCEPTED: Only received ${finalQty} out of ${detail.orderedQty} ordered. ${note}`;
              } else {
                status = ReceiptStatus.SHORT_PENDING;
                note = `SHORT PENDING: Only received ${finalQty} out of ${detail.orderedQty} ordered. Follow up with supplier. ${note}`;
              }
              break;
            case ReceiptStatus.SHORT_ACCEPTED:
              // Direct SHORT_ACCEPTED status - already set above
              note = `SHORT ACCEPTED: Only received ${finalQty} out of ${detail.orderedQty} ordered. ${note}`;
              break;
            case ReceiptStatus.SHORT_PENDING:
              // Direct SHORT_PENDING status - already set above
              note = `SHORT PENDING: Only received ${finalQty} out of ${detail.orderedQty} ordered. Follow up with supplier. ${note}`;
              break;
            case ReceiptStatus.OVER:
              // Check the specific overage handling
              if (detail.quantityValidation?.status === ReceiptStatus.OVER_ACCEPTED ||
                  detail.quantityValidation?.message?.includes(ReceiptStatusMessage.ACCEPTED_OVERAGE)) {
                status = ReceiptStatus.OVER_ACCEPTED;
                note = `OVER ACCEPTED: Received ${finalQty} vs ordered ${detail.orderedQty}. ${note}`;
              } else if (detail.quantityValidation?.status === ReceiptStatus.OVER_ADJUSTED ||
                         detail.quantityValidation?.message?.includes(ReceiptStatusMessage.ADJUSTING_ORDER)) {
                status = ReceiptStatus.OVER_ADJUSTED;
                note = `OVER ADJUSTED: Order adjusted from ${detail.orderedQty} to ${finalQty}. ${note}`;
              } else {
                status = ReceiptStatus.OVER_RETURN;
                note = `OVER RETURN: Received ${finalQty} vs ordered/remaining ${targetQty}. Return excess to supplier. ${note}`;
                // Immediately cap inventory input to target, account for damage (accept only good)
                const receivedInOrdered = detail.receivedUnitCode !== detail.unitCode && detail.convertedQty !== undefined
                  ? detail.convertedQty
                  : detail.receivedQty;
                const goodInOrdered = Math.max(0, receivedInOrdered - (detail.damageQty || 0));
                const acceptIntoStock = Math.min(targetQty, goodInOrdered);
                finalUnitCode = detail.unitCode;
                finalQty = acceptIntoStock;
              }
              break;
            case ReceiptStatus.OVER_ACCEPTED:
            case ReceiptStatus.OVER_ADJUSTED:
            case ReceiptStatus.OVER_RETURN:
              // Direct overage statuses - already set above
              note = `OVER ${status}: Received ${finalQty} vs ordered ${detail.orderedQty}. ${note}`;
              break;
            case ReceiptStatus.DAMAGE:
              // Handle damage cases with detailed status
              if (detail.quantityValidation?.status === ReceiptStatus.DAMAGE_ACCEPTED ||
                  detail.quantityValidation?.message?.includes(ReceiptStatusMessage.FULL_DAMAGE_ACCEPTED)) {
                status = ReceiptStatus.DAMAGE_ACCEPTED;
                note = `DAMAGE ACCEPTED: All ${detail.damageQty || 0} items damaged but accepted into inventory. ${note}`;
                // Include damaged items in inventory
                finalQty = detail.receivedQty; // Total received including damaged
              } else if (detail.quantityValidation?.status === ReceiptStatus.DAMAGE_RETURN ||
                         detail.quantityValidation?.message?.includes(ReceiptStatusMessage.RETURN_DAMAGED)) {
                status = ReceiptStatus.DAMAGE_RETURN;
                note = `DAMAGE RETURN: ${detail.damageQty || 0} damaged items returned to supplier. ${note}`;
                // Only good quantity goes to inventory
                finalQty = detail.receivedQty - (detail.damageQty || 0);
              } else if (detail.quantityValidation?.status === ReceiptStatus.DAMAGE_PARTIAL ||
                         detail.quantityValidation?.message?.includes(ReceiptStatusMessage.PARTIAL_DAMAGE_ACCEPTED)) {
                status = ReceiptStatus.DAMAGE_PARTIAL;
                // Only good quantity goes to inventory
                finalQty = detail.receivedQty - (detail.damageQty || 0);
                note = `DAMAGE PARTIAL: ${detail.damageQty || 0} damaged, ${finalQty} good items accepted. ${note}`;
              } else {
                // Default damage handling
                status = ReceiptStatus.DAMAGE_PARTIAL;
                const goodQty = finalQty - (detail.damageQty || 0);
                note = `DAMAGE PARTIAL: ${detail.damageQty || 0} damaged, ${goodQty} good items. ${note}`;
                finalQty = goodQty; // Only good quantity goes to inventory
              }
              break;
            case ReceiptStatus.DAMAGE_ACCEPTED:
              // Direct DAMAGE_ACCEPTED status - include all items (good + damaged)
              finalQty = detail.receivedQty; // Total received including damaged
              note = `DAMAGE ACCEPTED: All ${detail.damageQty || 0} damaged items accepted into inventory. ${note}`;
              break;
            case ReceiptStatus.DAMAGE_RETURN:
              // Direct DAMAGE_RETURN status - only good items
              finalQty = detail.receivedQty - (detail.damageQty || 0); // Only good quantity
              note = `DAMAGE RETURN: ${detail.damageQty || 0} damaged items returned to supplier. ${note}`;
              break;
            case ReceiptStatus.DAMAGE_PARTIAL:
              // Direct DAMAGE_PARTIAL status - only good items
              finalQty = detail.receivedQty - (detail.damageQty || 0); // Only good quantity
              note = `DAMAGE PARTIAL: ${detail.damageQty || 0} damaged, ${finalQty} good items accepted. ${note}`;
              break;
            case ReceiptStatus.RETURN:
              // Return item to supplier
              status = ReceiptStatus.RETURN;
              finalQty = 0;
              note = `RETURN: Item returned to supplier. ${note}`;
              break;
            case ReceiptStatus.OK:
            default:
              // Normal processing
              status = ReceiptStatus.OK;
              break;
          }

          // Decide if this item will be "closed" after this receipt
          const closingStatuses = new Set<ReceiptStatus>([
            ReceiptStatus.OK,
            ReceiptStatus.OVER_ACCEPTED,
            ReceiptStatus.OVER_ADJUSTED,
            ReceiptStatus.OVER_RETURN,
            ReceiptStatus.SHORT_ACCEPTED,
            ReceiptStatus.DAMAGE_ACCEPTED,
            // DAMAGE_PARTIAL allows more receipts (only good items accepted, can receive remaining)
            ReceiptStatus.DAMAGE_RETURN,
            ReceiptStatus.RETURN
          ]);
          const poDetailIdNum = detail.poDetailId ?? (detail as any).id;
          if (poDetailIdNum !== undefined && closingStatuses.has(status as ReceiptStatus)) {
            closedDetailIds.add(Number(poDetailIdNum));
          }
          
          // Skip sending RETURN lines to goods receipt (qtyInput = 0 is invalid on BE)
          if (status === ReceiptStatus.RETURN) {
            console.log(`[DEBUG handleSubmit] Skipping detail ${detailIndex} - status is RETURN`);
            return null;
          }

          const requestDetail = {
            poDetailId: detail.poDetailId,
            ingredientId: detail.ingredient.ingredientId,
            unitCodeInput: finalUnitCode,
            qtyInput: finalQty,
            unitPrice: detail.unitPrice,
            lotNumber: detail.lotNumber || '', // Use actual lot number
            mfgDate: detail.mfgDate || null,
            expDate: detail.expDate || null,
            status: status,
            damageQty: detail.damageQty || 0, // Use the damage quantity from the form
            note: note
          };

          console.log(`[DEBUG handleSubmit] Detail ${detailIndex} mapped to:`, requestDetail);
          return requestDetail;
        }).filter(detail => detail !== null)
      };

      console.log('[DEBUG handleSubmit] RequestData built:', {
        poId: requestData.poId,
        detailsCount: requestData.details.length,
        details: requestData.details
      });

      // Check if there are any items to process
      console.log('[DEBUG handleSubmit] Checking requestData.details.length:', requestData.details.length);
      if (requestData.details.length === 0) {
        console.error('[DEBUG handleSubmit] ERROR: requestData.details.length === 0, returning early');
        toast.error('No items to process. All items have already been handled.');
        setLoading(false);
        return;
      }

      console.log('[DEBUG handleSubmit] Proceeding to API call with', requestData.details.length, 'details');

      // Create Return Goods payload if any details require returns
      const returnDetails: Array<{ ingredientId: number; unitCode: string; qty: number; unitPrice: number; returnReason: string; }> = [];
      for (const d of requestData.details as any[]) {
        if (!d) continue;
        // Find original detail row by poDetailId for unit and damage context
        const original = details.find(x => x.poDetailId === d.poDetailId);
        // Map status to return behavior
        if (d.status === ReceiptStatus.OVER_RETURN) {
          // Return the excess portion: received - ordered (or remaining target if subsequent receipt)
          if (original) {
            const idKey = original.poDetailId ?? (original as any).id;
            const rs = idKey !== undefined ? receiptStatusesById[idKey] : undefined;
            const targetQty = rs && typeof rs.remainingQty === 'number' ? rs.remainingQty : original.orderedQty;
            // Compute good quantity in ordered unit to know true excess of good items
            const receivedInOrdered = original.receivedUnitCode !== original.unitCode && original.convertedQty !== undefined
              ? original.convertedQty
              : original.receivedQty;
            const goodInOrdered = Math.max(0, receivedInOrdered - (original.damageQty || 0));
            const excess = Math.max(0, goodInOrdered - targetQty);
            if (excess > 0) {
              returnDetails.push({
                ingredientId: d.ingredientId,
                unitCode: original.unitCode,
                qty: excess,
                unitPrice: d.unitPrice,
                returnReason: 'Return excess over ordered quantity'
              });
            }
          }
        } else if (d.status === ReceiptStatus.DAMAGE_RETURN) {
          // Return the damaged quantity
          const damage = Math.max(0, d.damageQty || 0);
          if (damage > 0) {
            returnDetails.push({
              ingredientId: d.ingredientId,
              unitCode: original?.unitCode || d.unitCodeInput,
              qty: damage,
              unitPrice: d.unitPrice,
              returnReason: 'Return damaged items'
            });
          }
        } else if (d.status === ReceiptStatus.DAMAGE_PARTIAL) {
          // Return the damaged quantity for DAMAGE_PARTIAL (partial damage - only good items accepted)
          const damage = Math.max(0, d.damageQty || 0);
          if (damage > 0) {
            returnDetails.push({
              ingredientId: d.ingredientId,
              unitCode: original?.unitCode || d.unitCodeInput,
              qty: damage,
              unitPrice: d.unitPrice,
              returnReason: 'Return damaged items (partial damage)'
            });
          }
        } else if (d.status === ReceiptStatus.RETURN) {
          // Return entire line quantity user attempted to receive
          const qty = Math.max(0, d.qtyInput || 0);
          if (qty > 0) {
            returnDetails.push({
              ingredientId: d.ingredientId,
              unitCode: d.unitCodeInput,
              qty: qty,
              unitPrice: d.unitPrice,
              returnReason: 'Return item to supplier'
            });
          }
        }
      }

      // First create Goods Receipt
      console.log('[DEBUG handleSubmit] Calling catalogService.createGoodsReceipt with:', requestData);
      await catalogService.createGoodsReceipt(requestData);
      console.log('[DEBUG handleSubmit] catalogService.createGoodsReceipt completed successfully');

      // Also add RETURN items (full line returns) from original details, since we skipped them in GRN
      for (const original of details) {
        if (original.quantityValidation?.status === ReceiptStatus.RETURN) {
          const qtyReturn = original.receivedUnitCode !== original.unitCode && original.convertedQty !== undefined
            ? original.convertedQty
            : original.receivedQty;
          if (qtyReturn > 0) {
            returnDetails.push({
              ingredientId: original.ingredient.ingredientId,
              unitCode: original.unitCode,
              qty: qtyReturn,
              unitPrice: original.unitPrice,
              returnReason: 'Return item to supplier'
            });
          }
        }
      }

      // Then create Return Goods if needed
      if (returnDetails.length > 0) {
        const created = await catalogService.createReturnGoods({
          poId: purchaseOrder.poId,
          supplierId: supplierId,
          branchId: purchaseOrder.branchId,
          receivedBy: user?.user_id || 1,
          returnReason: 'Auto-generated from Goods Receipt actions',
          details: returnDetails
        });

        // Auto-approve and process to deduct inventory immediately
        if (created?.returnId) {
          try {
            await catalogService.approveReturnGoods(created.returnId);
          } catch {}
          try {
            await catalogService.processReturnGoods(created.returnId);
          } catch {}
        }
      }

      // Determine PO status based on receipt status
      let poStatus = 'PARTIALLY_RECEIVED';
      let statusMessage = 'Goods receipt created successfully';
      
      // After including this receipt, if all PO details are closed => RECEIVED
      const totalDetails = purchaseOrder.details?.length || details.length;
      const allItemsCompleted = closedDetailIds.size === totalDetails;
      
      // Check if all items are fully received (no pending issues) - for backward compatibility
      // IMPORTANT: Exclude SHORT_PENDING from allReceived check - these need follow-up
      const allReceived = details.every(detail => {
        // If user explicitly selected SHORT_PENDING, this item is NOT fully received
        if (detail.quantityValidation?.status === ReceiptStatus.SHORT_PENDING) {
          return false;
        }
        const validation = validateQuantityWithDamage(detail);
        return validation.status === ReceiptStatus.OK || 
               (validation.status === ReceiptStatus.OVER && detail.quantityValidation?.message?.includes(ReceiptStatusMessage.ACCEPTED_OVERAGE)) ||
               (validation.status === ReceiptStatus.OVER && detail.quantityValidation?.message?.includes(ReceiptStatusMessage.ADJUSTING_ORDER)) ||
               (validation.status === ReceiptStatus.SHORT && detail.quantityValidation?.message?.includes(ReceiptStatusMessage.ACCEPTED_SHORTAGE));
      });
      
      // Check for different types of issues
      const hasPendingShortages = details.some(detail => {
        // Check if user explicitly selected SHORT_PENDING (Follow Up)
        if (detail.quantityValidation?.status === ReceiptStatus.SHORT_PENDING) {
          return true;
        }
        // Otherwise check validation result
        const validation = validateQuantityWithDamage(detail);
        return validation.status === ReceiptStatus.SHORT && 
               !detail.quantityValidation?.message?.includes(ReceiptStatusMessage.ACCEPTED_SHORTAGE);
      });
      
      
      const hasAcceptedShortages = details.some(detail => {
        const validation = validateQuantityWithDamage(detail);
        return validation.status === ReceiptStatus.SHORT && 
               detail.quantityValidation?.message?.includes(ReceiptStatusMessage.ACCEPTED_SHORTAGE);
      });
      
      const hasDamages = details.some(detail => {
        const validation = validateQuantityWithDamage(detail);
        return validation.status === ReceiptStatus.DAMAGE;
      });
      
      const hasReturns = details.some(detail => {
        const validation = validateQuantityWithDamage(detail);
        return validation.status === ReceiptStatus.RETURN;
      });
      
      
      // Priority order: Check for pending issues first (they prevent RECEIVED status)
      if (allItemsCompleted) {
        poStatus = 'RECEIVED';
        statusMessage = 'All items completed. PO status updated to RECEIVED';
      } else if (hasPendingShortages) {
        // If ANY item has pending shortages (SHORT_PENDING), status must be PARTIALLY_RECEIVED
        // This allows creating additional receipts to receive remaining quantities
        poStatus = 'PARTIALLY_RECEIVED';
        statusMessage = 'Items received with pending shortages. PO status updated to PARTIALLY_RECEIVED - Follow up with supplier';
      } else if (hasReturns) {
        poStatus = 'PARTIALLY_RECEIVED';
        statusMessage = 'Items returned to supplier. PO status updated to PARTIALLY_RECEIVED - Follow up with supplier';
      } else if (allReceived && !hasDamages) {
        // Only set RECEIVED if all items are received and no pending issues
        poStatus = 'RECEIVED';
        statusMessage = 'All items received successfully. PO status updated to RECEIVED';
      } else if (hasAcceptedShortages || hasDamages) {
        poStatus = 'RECEIVED';
        statusMessage = 'Items received with accepted shortages/damages. PO status updated to RECEIVED';
      }

      // Update PO status
      try {
        await catalogService.updatePurchaseOrderStatus(purchaseOrder.poId, poStatus);
        toast.success(statusMessage);
      } catch (statusError) {
        console.warn('Failed to update PO status:', statusError);
        toast.success('Goods receipt created successfully');
      }
      
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('[DEBUG handleSubmit] ERROR caught:', error);
      console.error('[DEBUG handleSubmit] Error message:', error.message);
      console.error('[DEBUG handleSubmit] Error stack:', error.stack);
      toast.error(error.message || 'Failed to create goods receipt');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Create Goods Receipt
            </h2>
          </div>
          <button
            onClick={handleModalClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GRN Number
              </label>
              <input
                type="text"
                value={formData.grnNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, grnNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Received Date & Time
              </label>
              <input
                type="datetime-local"
                value={formData.receivedAt}
                onChange={(e) => setFormData(prev => ({ ...prev, receivedAt: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Additional notes about the receipt..."
            />
          </div>

          {/* Details Table - Comparison View */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Ordered vs Received Items</h3>
            <div className="overflow-x-auto min-w-full">
              <table className="w-full border-collapse border border-gray-300 min-w-[800px]">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-2 text-left">Ingredient/Notes</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Ordered</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Received</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Unit Price</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Line Total</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">MFG Date</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">EXP Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDetails.map((detail, index) => {
                    // Map filtered index back to original details index by poDetailId/id
                    const originalIndex = details.findIndex((d: any) => (
                      d.poDetailId === (detail as any).poDetailId) || (d.id !== undefined && d.id === (detail as any).id)
                    );
                    const hasError = detail.quantityValidation && 
                      (detail.quantityValidation.status === 'SHORT' || detail.quantityValidation.status === 'OVER');
                    
                    return (
                    <React.Fragment key={index}>
                        {/* Main data row */}
                        <tr className={`hover:bg-gray-50 ${hasError ? 'bg-red-50' : ''}`}>
                         {/* Ingredient Column - spans 3 rows */}
                         <td rowSpan={3} className="border border-gray-300 px-4 py-2">
                           <div className="font-medium">{detail.ingredient?.name || 'Unknown Ingredient'}</div>
                         </td>
                      
                        {/* Ordered Column */}
                        <td className="border border-gray-300 px-4 py-2 bg-blue-50">
                          <div className="space-y-1">
                            <div className="text-sm text-gray-600">Qty: {detail.orderedQty}</div>
                            <div className="text-sm text-gray-600">Unit: {detail.unitCode}</div>
                            
                            {/* Receipt Status Display - Only show if there are actual receipt records */}
                            {(() => {
                              const idKey = detail.poDetailId ?? (detail as any).id;
                              const receiptStatus = idKey !== undefined ? receiptStatusesById[idKey] : undefined;
                              const ordered = detail.orderedQty;
                              
                              // Only display receipt status if there are actual receipt records
                              if (!receiptStatus) {
                                return null; // Don't show anything if no receipt records exist
                              }
                              
                              const { receivedQty, status, remainingQty, canReceiveMore } = receiptStatus;
                              
                              return (
                                <div className="mt-2 p-2 bg-white rounded border">
                                  <div className="text-xs text-gray-600">
                                    {receivedQty}/{ordered} {detail.unitCode}
                                  </div>
                                  {remainingQty > 0 && (
                                    <div className="text-xs text-orange-600 font-medium mt-1">
                                      Remaining: {remainingQty} {detail.unitCode}
                                    </div>
                                  )}
                                  {!canReceiveMore && status === 'PARTIALLY_RECEIVED' && (
                                    <div className="text-xs text-red-600 font-medium mt-1">
                                      <AlertTriangle className="w-3 h-3 inline mr-1" /> Cannot receive more
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </td>
                      
                        {/* Received Column */}
                        <td className="border border-gray-300 px-4 py-2">
                          <div className="space-y-2">
                            <div className="flex gap-2">
                               <input
                                 type="number"
                                 value={detail.receivedQty}
                                 onChange={(e) => handleDetailChange(originalIndex, 'receivedQty', parseFloat(e.target.value) || 0)}
                                 className={`w-20 px-2 py-1 border rounded focus:outline-none focus:ring-1 ${
                                   detail.receivedQty < detail.damageQty 
                                     ? 'border-red-500 bg-red-50' 
                                     : 'border-gray-300 focus:ring-blue-500'
                                 }`}
                                 min="0"
                                 step="0.01"
                                 disabled={false}
                                 title={(detail.poDetailId ?? (detail as any).id) !== undefined && receiptStatusesById[detail.poDetailId ?? (detail as any).id]?.canReceiveMore === false ? 'Cannot receive more - previous receipt was accepted' : ''}
                               />
                               <select
                                 value={detail.receivedUnitCode}
                                 onChange={(e) => handleDetailChange(originalIndex, 'receivedUnitCode', e.target.value)}
                                 className={`w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 ${
                                   'focus:ring-blue-500'
                                 }`}
                                 disabled={unitsLoading}
                               >
                                <option value={detail.unitCode}>{detail.unitCode}</option>
                                 {units.map((unit) => (
                                   unit.code !== detail.unitCode && (
                                     <option key={unit.code} value={unit.code}>
                                       {unit.code} ({unit.name})
                                     </option>
                                   )
                                 ))}
                              </select>
                            </div>
                            
                            {/* Real-time quantity summary */}
                            <div className="text-xs space-y-1">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Received:</span>
                                <span className="font-medium">{detail.receivedQty} {detail.unitCode}</span>
                              </div>
                              {detail.damageQty > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-red-600">Damaged:</span>
                                  <span className="text-red-600 font-medium">{detail.damageQty} {detail.unitCode}</span>
                                </div>
                              )}
                              {detail.receivedQty > detail.damageQty && (
                                <div className="flex justify-between">
                                  <span className="text-green-600">Good:</span>
                                  <span className="text-green-600 font-medium">{detail.receivedQty - detail.damageQty} {detail.unitCode}</span>
                                </div>
                              )}
                              {detail.receivedQty < detail.damageQty && (
                                <div className="text-red-500 text-xs">
                                  <AlertTriangle className="w-3 h-3 inline mr-1" /> Invalid: Damage cannot exceed received quantity
                                </div>
                              )}
                              
                              {/* Receipt Status Message */}
                              {(detail.poDetailId ?? (detail as any).id) !== undefined && receiptStatusesById[detail.poDetailId ?? (detail as any).id] && (
                                <div className={`text-xs p-2 rounded ${
                                  receiptStatusesById[detail.poDetailId ?? (detail as any).id].canReceiveMore 
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                    : 'bg-orange-50 text-orange-700 border border-orange-200'
                                }`}>
                                  {receiptStatusesById[detail.poDetailId ?? (detail as any).id].receiptMessage}
                                  
                                  {/* Show remaining quantity for SHORT_PENDING */}
                                  {receiptStatusesById[detail.poDetailId ?? (detail as any).id].lastReceiptStatus === 'SHORT_PENDING' && receiptStatusesById[detail.poDetailId ?? (detail as any).id].remainingQty > 0 && (
                                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                                      <div className="text-yellow-800 font-medium flex items-center gap-1">
                                        <Package className="w-3 h-3" />
                                        Missing: {receiptStatusesById[detail.poDetailId ?? (detail as any).id].remainingQty} {detail.unitCode}
                                      </div>
                                      <div className="text-yellow-700 text-xs mt-1">
                                        You can enter more goods to compensate for the shortage
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          
                          {/* Conversion Info */}
                          {detail.receivedUnitCode !== detail.unitCode && (
                            <div className="text-xs">
                              {detail.conversionError ? (
                                <div className="space-y-1">
                                  <div className="text-red-600">{detail.conversionError}</div>
                                  {detail.showCreateConversion && (
                                    <button
                                      type="button"
                                      onClick={() => handleCreateConversion(index)}
                                      className="text-blue-600 hover:text-blue-800 underline"
                                    >
                                      Create conversion rule
                                    </button>
                                  )}
                                </div>
                              ) : detail.convertedQty ? (
                                <div className="text-green-600">
                                  = {detail.convertedQty} {detail.unitCode}
                                </div>
                              ) : null}
                            </div>
                          )}
                          
                          {/* Action Buttons for SHORT items */}
                          {(detail.quantityValidation?.status === ReceiptStatus.SHORT || 
                            detail.quantityValidation?.status === ReceiptStatus.SHORT_ACCEPTED ||
                            detail.quantityValidation?.status === ReceiptStatus.SHORT_PENDING) && (
                            <div className="flex gap-2 mt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  // Accept shortage - close this item
                                  handleDetailChange(originalIndex, 'quantityValidation', {
                                    status: ReceiptStatus.SHORT_ACCEPTED,
                                    message: `${ReceiptStatusMessage.ACCEPTED_SHORTAGE}: ${detail.receivedQty} received (${detail.orderedQty - detail.receivedQty} short)`
                                  });
                                  // Update selected action for visual feedback
                                  setSelectedActions(prev => ({
                                    ...prev,
                                    [originalIndex]: 'SHORT_ACCEPTED'
                                  }));
                                }}
                                className={`px-3 py-1 text-xs rounded border flex items-center gap-1 ${
                                  selectedActions[originalIndex] === 'SHORT_ACCEPTED' 
                                    ? 'bg-green-100 text-green-700 border-green-300' 
                                    : selectedActions[originalIndex] && selectedActions[originalIndex] !== 'SHORT_ACCEPTED'
                                    ? 'bg-gray-100 text-gray-500 border-gray-300 opacity-60'
                                    : 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200'
                                }`}
                              >
                                <CheckCircle className="w-3 h-3" />
                                {ReceiptStatusLabels.ACCEPT_SHORTAGE}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  // Mark for follow-up
                                  handleDetailChange(originalIndex, 'quantityValidation', {
                                    status: ReceiptStatus.SHORT_PENDING,
                                    message: `${ReceiptStatusMessage.SHORT_PENDING}: ${detail.receivedQty} received, ${detail.orderedQty - detail.receivedQty} pending - Follow up with supplier`
                                  });
                                  // Update selected action for visual feedback
                                  setSelectedActions(prev => ({
                                    ...prev,
                                    [originalIndex]: 'SHORT_PENDING'
                                  }));
                                }}
                                className={`px-3 py-1 text-xs rounded border flex items-center gap-1 ${
                                  selectedActions[originalIndex] === 'SHORT_PENDING' 
                                    ? 'bg-orange-100 text-orange-700 border-orange-300' 
                                    : selectedActions[originalIndex] && selectedActions[originalIndex] !== 'SHORT_PENDING'
                                    ? 'bg-gray-100 text-gray-500 border-gray-300 opacity-60'
                                    : 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200'
                                }`}
                              >
                                <AlertTriangle className="w-3 h-3" />
                                {ReceiptStatusLabels.FOLLOW_UP_SHORTAGE}
                              </button>
                            </div>
                          )}

                          {/* Action Buttons for OVER items */}
                          {(detail.quantityValidation?.status === ReceiptStatus.OVER ||
                            detail.quantityValidation?.status === ReceiptStatus.OVER_ACCEPTED ||
                            detail.quantityValidation?.status === ReceiptStatus.OVER_ADJUSTED ||
                            detail.quantityValidation?.status === ReceiptStatus.OVER_RETURN) && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  // Accept overage - keep all items
                                  handleDetailChange(originalIndex, 'quantityValidation', {
                                    status: ReceiptStatus.OVER_ACCEPTED,
                                    message: `${ReceiptStatusMessage.ACCEPTED_OVERAGE}: ${detail.receivedQty} received (${detail.receivedQty - detail.orderedQty} extra)`
                                  });
                                  // Update selected action for visual feedback
                                  setSelectedActions(prev => ({
                                    ...prev,
                                    [originalIndex]: 'OVER_ACCEPTED'
                                  }));
                                }}
                                className={`px-3 py-1 text-xs rounded border flex items-center gap-1 ${
                                  selectedActions[originalIndex] === 'OVER_ACCEPTED' 
                                    ? 'bg-green-100 text-green-700 border-green-300' 
                                    : selectedActions[originalIndex] && selectedActions[originalIndex] !== 'OVER_ACCEPTED'
                                    ? 'bg-gray-100 text-gray-500 border-gray-300 opacity-60'
                                    : 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200'
                                }`}
                              >
                                <CheckCircle className="w-3 h-3" />
                                Accept All
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  // Accept only ordered quantity, return excess
                                  if (!detail.notes || detail.notes.trim() === '') {
                                    toast.error('Please provide a reason for returning excess items in the notes field');
                                    return;
                                  }
                                  
                                  handleDetailChange(originalIndex, 'quantityValidation', {
                                    status: ReceiptStatus.OVER_RETURN,
                                    message: `RETURN: Returning ${detail.receivedQty - detail.orderedQty} excess to supplier - ${detail.notes}`
                                  });
                                  // Update selected action for visual feedback
                                  setSelectedActions(prev => ({
                                    ...prev,
                                    [originalIndex]: 'OVER_RETURN'
                                  }));
                                }}
                                className={`px-3 py-1 text-xs rounded border flex items-center gap-1 ${
                                  selectedActions[originalIndex] === 'OVER_RETURN' 
                                    ? 'bg-red-100 text-red-700 border-red-300' 
                                    : selectedActions[originalIndex] && selectedActions[originalIndex] !== 'OVER_RETURN'
                                    ? 'bg-gray-100 text-gray-500 border-gray-300 opacity-60'
                                    : 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200'
                                }`}
                              >
                                <RotateCcw className="w-3 h-3" />
                                {ReceiptStatusLabels.RETURN_EXCESS}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  // Adjust order quantity
                                  if (!detail.notes || detail.notes.trim() === '') {
                                    toast.error('Please provide details for order adjustment in the notes field');
                                    return;
                                  }
                                  
                                  handleDetailChange(originalIndex, 'quantityValidation', {
                                    status: ReceiptStatus.OVER_ADJUSTED,
                                    message: `${ReceiptStatusMessage.ADJUSTING_ORDER}: Adjusting order from ${detail.orderedQty} to ${detail.receivedQty} - ${detail.notes}`
                                  });
                                  // Update selected action for visual feedback
                                  setSelectedActions(prev => ({
                                    ...prev,
                                    [originalIndex]: 'OVER_ADJUSTED'
                                  }));
                                }}
                                className={`px-3 py-1 text-xs rounded border flex items-center gap-1 ${
                                  selectedActions[originalIndex] === 'OVER_ADJUSTED' 
                                    ? 'bg-yellow-100 text-yellow-700 border-yellow-300' 
                                    : selectedActions[originalIndex] && selectedActions[originalIndex] !== 'OVER_ADJUSTED'
                                    ? 'bg-gray-100 text-gray-500 border-gray-300 opacity-60'
                                    : 'bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200'
                                }`}
                              >
                                <AlertCircle className="w-3 h-3" />
                                {ReceiptStatusLabels.ADJUST_ORDER}
                              </button>
                            </div>
                          )}

                          {/* Action Buttons for General Cases */}
                          <div className="flex gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => {
                                // Check if notes are provided for return
                                if (!detail.notes || detail.notes.trim() === '') {
                                  toast.error('Please provide a reason for returning this item in the notes field');
                                  return;
                                }
                                
                                // Return item to supplier
                                handleDetailChange(originalIndex, 'quantityValidation', {
                                  status: ReceiptStatus.RETURN,
                                  message: `RETURN: Item returned to supplier - ${detail.notes}`
                                });
                              }}
                              disabled={false}
                              className={`px-3 py-1 text-xs rounded border flex items-center gap-1 ${
                                (detail.poDetailId ?? (detail as any).id) !== undefined && receiptStatusesById[detail.poDetailId ?? (detail as any).id]?.canReceiveMore === false
                                  ? 'border-gray-300 focus:ring-blue-500'
                                  : selectedActions[originalIndex] === 'RETURN' 
                                  ? 'bg-purple-100 text-purple-700 border-purple-300' 
                                  : selectedActions[originalIndex] && selectedActions[originalIndex] !== 'RETURN'
                                  ? 'bg-gray-100 text-gray-500 border-gray-300 opacity-60'
                                  : 'bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200'
                              }`}
                            >
                              <RotateCcw className="w-3 h-3" />
                              Return Item
                            </button>
                          </div>

                          {/* Damage Quantity Input */}
                          <div className="flex items-center gap-2 mt-2">
                            <label htmlFor={`damage-${index}`} className="text-sm text-red-600 font-medium flex items-center gap-1">
                              <Zap className="w-4 h-4" />
                              Damage Qty:
                            </label>
                            <input
                              type="number"
                              id={`damage-${index}`}
                              value={detail.damageQty}
                              disabled={false}
                              onChange={(e) => {
                                const damageQty = parseFloat(e.target.value) || 0;
                                const maxDamage = detail.receivedQty; // Can't damage more than received
                                
                                // Validate damage quantity
                                if (damageQty > maxDamage) {
                                  toast.error(`Damage quantity cannot exceed received quantity (${maxDamage})`);
                                  return;
                                }
                                
                                const newDetails = [...details];
                                newDetails[originalIndex] = { 
                                  ...newDetails[originalIndex], 
                                  damageQty: damageQty
                                };
                                
                                // Update validation based on damage quantity
                                const validation = validateQuantityWithDamage(newDetails[originalIndex]);
                                
                                // Only update quantityValidation if user hasn't selected a specific action
                                const currentStatus = newDetails[originalIndex].quantityValidation?.status;
                                const isUserSelectedStatus = currentStatus && (
                                  currentStatus === ReceiptStatus.SHORT_ACCEPTED ||
                                  currentStatus === ReceiptStatus.SHORT_PENDING ||
                                  currentStatus === ReceiptStatus.OVER_ACCEPTED ||
                                  currentStatus === ReceiptStatus.OVER_ADJUSTED ||
                                  currentStatus === ReceiptStatus.OVER_RETURN ||
                                  currentStatus === ReceiptStatus.DAMAGE_ACCEPTED ||
                                  currentStatus === ReceiptStatus.DAMAGE_RETURN ||
                                  currentStatus === ReceiptStatus.DAMAGE_PARTIAL ||
                                  currentStatus === ReceiptStatus.RETURN
                                );
                                
                                if (!isUserSelectedStatus) {
                                  newDetails[originalIndex].quantityValidation = validation;
                                }
                                
                                setDetails(newDetails);
                                
                                // Don't auto-select any action when damage is entered
                                // Let user choose from the 3 options
                                if (damageQty === 0) {
                                  setSelectedActions(prev => {
                                    const newActions = { ...prev };
                                    delete newActions[originalIndex];
                                    return newActions;
                                  });
                                }
                              }}
                              className={`w-20 px-2 py-1 border rounded focus:outline-none focus:ring-1 ${
                                detail.damageQty > detail.receivedQty 
                                  ? 'border-red-500 bg-red-50' 
                                  : 'border-gray-300 focus:ring-blue-500'
                              }`}
                              min="0"
                              max={detail.receivedQty}
                              step="0.01"
                              placeholder="0"
                              // disabled={false}
                              title={(detail.poDetailId ?? (detail as any).id) !== undefined && receiptStatusesById[detail.poDetailId ?? (detail as any).id]?.canReceiveMore === false ? 'Cannot receive more - previous receipt was accepted' : ''}
                            />
                            <span className={`text-xs ${
                              detail.damageQty > detail.receivedQty 
                                ? 'text-red-500' 
                                : 'text-gray-500'
                            }`}>
                              (max: {detail.receivedQty})
                            </span>
                          </div>

                          {/* Action Buttons for DAMAGE items */}
                          {detail.damageQty > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  // Accept partial damage - take what's good
                                  if (!detail.notes || detail.notes.trim() === '') {
                                    toast.error('Please provide details about the damage in the notes field');
                                    return;
                                  }
                                  
                                  // Show quantity input modal
                                  setQuantityModalData({
                                    index: index,
                                    maxQty: detail.orderedQty,
                                    currentQty: detail.receivedQty - detail.damageQty,
                                    title: 'Enter Good Quantity'
                                  });
                                  setShowQuantityModal(true);
                                }}
                                className={`px-3 py-1 text-xs rounded border flex items-center gap-1 ${
                                  selectedActions[index] === 'DAMAGE_PARTIAL'
                                    ? 'bg-green-100 text-green-700 border-green-300' 
                                    : selectedActions[index] && selectedActions[index] !== 'DAMAGE_PARTIAL'
                                    ? 'bg-gray-100 text-gray-500 border-gray-300 opacity-60'
                                    : 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200'
                                }`}
                              >
                                <CheckCircle className="w-3 h-3" />
                                {ReceiptStatusLabels.TAKE_GOOD_PARTS}
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => {
                                  // Return damaged items
                                  if (!detail.notes || detail.notes.trim() === '') {
                                    toast.error('Please provide a reason for returning damaged items in the notes field');
                                    return;
                                  }
                                  
                                  handleDetailChange(originalIndex, 'quantityValidation', {
                                    status: ReceiptStatus.DAMAGE_RETURN,
                                    message: `${ReceiptStatusMessage.RETURN_DAMAGED}: Returning damaged items to supplier. ${detail.notes}`
                                  });
                                  // Update selected action for visual feedback
                                  setSelectedActions(prev => ({
                                    ...prev,
                                    [originalIndex]: 'DAMAGE_RETURN'
                                  }));
                                }}
                                className={`px-3 py-1 text-xs rounded border flex items-center gap-1 ${
                                  selectedActions[index] === 'DAMAGE_RETURN' 
                                    ? 'bg-red-100 text-red-700 border-red-300' 
                                    : selectedActions[index] && selectedActions[index] !== 'DAMAGE_RETURN'
                                    ? 'bg-gray-100 text-gray-500 border-gray-300 opacity-60'
                                    : 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200'
                                }`}
                              >
                                <RotateCcw className="w-3 h-3" />
                                {ReceiptStatusLabels.RETURN_DAMAGED}
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => {
                                  // Accept full damage - no inventory
                                  if (!detail.notes || detail.notes.trim() === '') {
                                    toast.error('Please provide details about the damage in the notes field');
                                    return;
                                  }
                                  
                                  handleDetailChange(originalIndex, 'quantityValidation', {
                                    status: ReceiptStatus.DAMAGE_ACCEPTED,
                                    message: `${ReceiptStatusMessage.FULL_DAMAGE_ACCEPTED}: All items damaged, not received into inventory. ${detail.notes}`
                                  });
                                  // Update selected action for visual feedback
                                  setSelectedActions(prev => ({
                                    ...prev,
                                    [originalIndex]: 'DAMAGE_ACCEPTED'
                                  }));
                                }}
                                className={`px-3 py-1 text-xs rounded border flex items-center gap-1 ${
                                  selectedActions[originalIndex] === 'DAMAGE_ACCEPTED' 
                                    ? 'bg-orange-100 text-orange-700 border-orange-300' 
                                    : selectedActions[originalIndex] && selectedActions[originalIndex] !== 'DAMAGE_ACCEPTED'
                                    ? 'bg-gray-100 text-gray-500 border-gray-300 opacity-60'
                                    : 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200'
                                }`}
                              >
                                <Zap className="w-3 h-3" />
                                {ReceiptStatusLabels.ACCEPT_FULL_DAMAGE}
                              </button>
                            </div>
                          )}
                          
                          {/* Quantity Validation */}
                          {detail.quantityValidation && (
                            <div className="text-xs mt-1">
                              <div className={`font-medium ${
                                detail.quantityValidation.status === 'OK' ? 'text-green-600' :
                                detail.quantityValidation.status === 'SHORT' ? 'text-orange-600' :
                                detail.quantityValidation.status === 'OVER' ? 'text-blue-600' :
                                detail.quantityValidation.status === 'DAMAGE' ? 'text-red-600' :
                                detail.quantityValidation.status === 'RETURN' ? 'text-purple-600' :
                                'text-gray-600'
                              }`}>
                                <div className="flex items-center gap-1">
                                  {detail.quantityValidation.status === 'OK' && <CheckCircle className="w-3 h-3" />}
                                  {detail.quantityValidation.status === 'SHORT' && <AlertTriangle className="w-3 h-3" />}
                                  {detail.quantityValidation.status === 'OVER' && <Package2 className="w-3 h-3" />}
                                  {detail.quantityValidation.status === 'DAMAGE' && <Zap className="w-3 h-3" />}
                                  {detail.quantityValidation.status === 'RETURN' && <RotateCcw className="w-3 h-3" />}
                                  <span>{detail.quantityValidation.message}</span>
                                </div>
                              </div>
                            </div>
                          )}
                          </div>
                        </td>
                      
                        {/* Unit Price Column */}
                        <td className="border border-gray-300 px-4 py-2">
                          <div className="text-sm font-medium text-gray-700">
                            {(detail.unitPrice || 0).toLocaleString()} VND / {units.find(unit => unit.code === detail.unitCode)?.name || detail.unitCode}
                          </div>
                        </td>
                        {/* Line Total Column */}
                        <td className="border border-gray-300 px-4 py-2">
                          <div className="font-medium">
                            {(detail.lineTotal || 0).toLocaleString()} VND
                          </div>
                        </td>
                      
                        {/* MFG Date Column */}
                        <td className="border border-gray-300 px-4 py-2">
                          <input
                            type="date"
                            value={detail.mfgDate}
                            onChange={(e) => handleDetailChange(originalIndex, 'mfgDate', e.target.value)}
                            disabled={false}
                            className={`w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 ${
                              (detail.poDetailId ?? (detail as any).id) !== undefined && receiptStatusesById[detail.poDetailId ?? (detail as any).id]?.canReceiveMore === false
                                ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
                                : 'border-gray-300 focus:ring-blue-500'
                            }`}
                          />
                        </td>
                        
                        {/* EXP Date Column */}
                        <td className="border border-gray-300 px-4 py-2">
                          <input
                            type="date"
                            value={detail.expDate}
                            onChange={(e) => handleDetailChange(originalIndex, 'expDate', e.target.value)}
                            disabled={false}
                            className={`w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 ${
                              (detail.poDetailId ?? (detail as any).id) !== undefined && receiptStatusesById[detail.poDetailId ?? (detail as any).id]?.canReceiveMore === false
                                ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
                                : 'border-gray-300 focus:ring-blue-500'
                            }`}
                          />
                        </td>
                      </tr>
                      
                      {/* Lot Number row - spans 6 columns (no ingredient column) */}
                      <tr className="bg-blue-50">
                        <td colSpan={6} className="border border-gray-300 px-4 py-2">
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-blue-700 whitespace-nowrap">
                              Lot Number:
                            </label>
                            <div className="flex gap-1 flex-1">
                              <input
                                type="text"
                              value={detail.lotNumber}
                              onChange={(e) => handleDetailChange(originalIndex, 'lotNumber', e.target.value)}
                                disabled={false}
                                className={`flex-1 px-2 py-1 border rounded focus:outline-none focus:ring-1 ${
                                  (detail.poDetailId ?? (detail as any).id) !== undefined && receiptStatusesById[detail.poDetailId ?? (detail as any).id]?.canReceiveMore === false
                                    ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
                                    : 'border-blue-300 focus:ring-blue-500'
                                }`}
                                placeholder="e.g., LOT-2024-001"
                              />
                              <button
                                type="button"
                                disabled={false}
                                onClick={() => {
                                  const currentDate = new Date();
                                  const dateStr = currentDate.toISOString().slice(0, 10).replace(/-/g, '');
                                  const timeStr = currentDate.toTimeString().slice(0, 8).replace(/:/g, '');
                                  const newLotNumber = `LOT-${dateStr}-${timeStr}-${String(index + 1).padStart(3, '0')}`;
                                  handleDetailChange(originalIndex, 'lotNumber', newLotNumber);
                                }}
                                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 border border-blue-300"
                                title="Generate new lot number"
                              >
                                🔄
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Notes row - spans 6 columns (no ingredient column) */}
                      <tr className={`${hasError ? 'bg-red-50' : 'bg-gray-50'}`}>
                        <td colSpan={6} className="border border-gray-300 px-4 py-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={detail.notes}
                              onChange={(e) => handleDetailChange(originalIndex, 'notes', e.target.value)}
                              disabled={false}
                              className={`w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                detail.quantityValidation?.status === 'RETURN' && (!detail.notes || detail.notes.trim() === '')
                                  ? 'border-red-500 bg-red-50' 
                                  : 'border-gray-300'
                              }`}
                              placeholder={
                                detail.quantityValidation?.status === 'RETURN' 
                                  ? "REQUIRED: Enter reason for returning this item..." 
                                  : "Enter notes for this item..."
                              }
                            />
                            {detail.quantityValidation?.status === 'RETURN' && (
                              <span className="text-red-500 text-xs font-medium">*</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-gray-900">Total Items:</span>
              <span className="text-lg font-bold text-blue-600">
                {details.length} items
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-lg font-medium text-gray-900">Total Value:</span>
              <span className="text-lg font-bold text-green-600">
                {details.reduce((sum, detail) => sum + (detail.lineTotal || 0), 0).toLocaleString()} VND
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleModalClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Goods Receipt'}
            </button>
          </div>
        </form>
      </div>

      {/* Create Conversion Modal */}
      {showCreateConversionModal && conversionData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Create Unit Conversion</h3>
              <button
                onClick={() => setShowCreateConversionModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ingredient
                  </label>
                  <div className="text-sm text-gray-900">{conversionData.ingredientName}</div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      From Unit
                    </label>
                    <div className="text-sm text-gray-900">{conversionData.fromUnit}</div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      To Unit
                    </label>
                    <div className="text-sm text-gray-900">{conversionData.toUnit}</div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Conversion Factor
                  </label>
                  <input
                    type="number"
                    value={conversionData.factor}
                    onChange={(e) => setConversionData(prev => prev ? {
                      ...prev,
                      factor: parseFloat(e.target.value) || 1
                    } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0.0001"
                    step="0.0001"
                    placeholder="e.g., 0.001 for g to kg"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    How many {conversionData.toUnit} = 1 {conversionData.fromUnit}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateConversionModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveConversion}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Create Conversion
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quantity Input Modal */}
      {showQuantityModal && quantityModalData && (
        <QuantityInputModal
          isOpen={showQuantityModal}
          onClose={() => {
            setShowQuantityModal(false);
            setQuantityModalData(null);
          }}
          onSubmit={handleQuantityModalSubmit}
          data={quantityModalData}
        />
      )}
    </div>
  );
};

export default GoodsReceiptModal;
