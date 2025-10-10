import React, { useState, useEffect } from 'react';
import { X, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { catalogService } from '../../services/catalogService';
import { useAuth } from '../../context/AuthContext';

interface GoodsReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: any;
  onSuccess: () => void;
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
  conversionError?: string;
  convertedQty?: number;
  showCreateConversion?: boolean;
  quantityValidation?: {
    status: 'OK' | 'SHORT' | 'OVER' | 'UNKNOWN';
    message: string;
  };
}

const GoodsReceiptModal: React.FC<GoodsReceiptModalProps> = ({
  isOpen,
  onClose,
  purchaseOrder,
  onSuccess
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    grnNumber: '',
    receivedAt: new Date().toISOString().slice(0, 16),
    notes: '',
    status: 'COMPLETED'
  });

  const [details, setDetails] = useState<GoodsReceiptDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState<any[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [showCreateConversionModal, setShowCreateConversionModal] = useState(false);
  const [conversionData, setConversionData] = useState<{
    ingredientId: number;
    ingredientName: string;
    fromUnit: string;
    toUnit: string;
    factor: number;
  } | null>(null);

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


  useEffect(() => {
    if (isOpen && purchaseOrder) {
      // Load units when modal opens
      loadUnits();
      
       // Initialize details from PO details
       const initialDetails = purchaseOrder.details.map((detail: any) => {
         const newDetail = {
           poDetailId: detail.id,
           ingredient: detail.ingredient,
           unitCode: detail.unitCode,
           orderedQty: detail.qty,
           receivedQty: detail.qty, // Default to ordered quantity
           receivedUnitCode: detail.unitCode, // Default to same unit
           unitPrice: detail.ingredient.unitPrice, // Use ingredient's standard unit price
           lineTotal: detail.qty * detail.ingredient.unitPrice, // Calculate with standard price
           mfgDate: '',
           expDate: '',
           notes: ''
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
    }
  }, [isOpen, purchaseOrder]);

  const validateUnitConversion = async (ingredientId: number, fromUnit: string, toUnit: string, quantity: number) => {
    try {
      return await catalogService.validateUnitConversion({
        ingredientId,
        fromUnitCode: fromUnit,
        toUnitCode: toUnit,
        quantity
      });
    } catch (error) {
      console.error('Unit conversion validation error:', error);
      return { canConvert: false, errorMessage: 'Failed to validate unit conversion' };
    }
  };

  const validateQuantity = (detail: GoodsReceiptDetail): { status: 'OK' | 'SHORT' | 'OVER' | 'UNKNOWN'; message: string } => {
    if (detail.receivedUnitCode === detail.unitCode) {
      // Same unit - direct comparison
      const receivedQty = detail.receivedQty;
      const orderedQty = detail.orderedQty;
      
      if (receivedQty > orderedQty) {
        return { status: 'OVER', message: `Received ${receivedQty} > Ordered ${orderedQty}` };
      } else if (receivedQty < orderedQty) {
        return { status: 'SHORT', message: `Received ${receivedQty} < Ordered ${orderedQty}` };
      } else {
        return { status: 'OK', message: `Received ${receivedQty} = Ordered ${orderedQty}` };
      }
    } else {
      // Different units - need conversion
      if (detail.convertedQty !== undefined) {
        const receivedQty = detail.convertedQty;
        const orderedQty = detail.orderedQty;
        
        if (receivedQty > orderedQty) {
          return { status: 'OVER', message: `Received ${detail.receivedQty} ${detail.receivedUnitCode} (${receivedQty.toFixed(4)} ${detail.unitCode}) > Ordered ${orderedQty} ${detail.unitCode}` };
        } else if (receivedQty < orderedQty) {
          return { status: 'SHORT', message: `Received ${detail.receivedQty} ${detail.receivedUnitCode} (${receivedQty.toFixed(4)} ${detail.unitCode}) < Ordered ${orderedQty} ${detail.unitCode}` };
        } else {
          return { status: 'OK', message: `Received ${detail.receivedQty} ${detail.receivedUnitCode} (${receivedQty.toFixed(4)} ${detail.unitCode}) = Ordered ${orderedQty} ${detail.unitCode}` };
        }
      } else {
        return { status: 'UNKNOWN', message: 'Cannot compare - conversion failed' };
      }
    }
  };

  const handleDetailChange = async (index: number, field: keyof GoodsReceiptDetail, value: any) => {
    const newDetails = [...details];
    newDetails[index] = { ...newDetails[index], [field]: value };
    
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

         console.log('conversion', conversion);
         
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
    const validation = validateQuantity(newDetails[index]);
    newDetails[index].quantityValidation = validation;
    
    setDetails(newDetails);
  };

  const handleCreateConversion = (index: number) => {
    const detail = details[index];
    setConversionData({
      ingredientId: detail.ingredient.ingredientId,
      ingredientName: detail.ingredient.name,
      fromUnit: detail.unitCode,
      toUnit: detail.receivedUnitCode,
      factor: 1 // Default factor, user can change
    });
    setShowCreateConversionModal(true);
  };

  const handleSaveConversion = async () => {
    if (!conversionData) return;

    try {
      await catalogService.createUnitConversion({
        ingredientId: conversionData.ingredientId,
        fromUnitCode: conversionData.fromUnit,
        toUnitCode: conversionData.toUnit,
        factor: conversionData.factor,
        description: `Conversion from ${conversionData.fromUnit} to ${conversionData.toUnit}`
      });

      toast.success('Unit conversion created successfully');
      setShowCreateConversionModal(false);
      setConversionData(null);

      // Re-validate the conversion
      const index = details.findIndex(d => d.ingredient.ingredientId === conversionData.ingredientId);
      if (index !== -1) {
        await handleDetailChange(index, 'receivedUnitCode', details[index].receivedUnitCode);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create unit conversion');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Debug logs for purchaseOrder structure
      console.log('=== PURCHASE ORDER DEBUG ===');
      console.log('purchaseOrder:', purchaseOrder);
      console.log('purchaseOrder.poId:', purchaseOrder.poId);
      console.log('purchaseOrder.supplierId:', purchaseOrder.supplierId);
      console.log('purchaseOrder.branchId:', purchaseOrder.branchId);
      console.log('purchaseOrder.supplier:', purchaseOrder.supplier);
      
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

      const requestData = {
        poId: purchaseOrder.poId,
        supplierId: supplierId,
        branchId: purchaseOrder.branchId,
        receivedBy: user?.user_id || 1, // Get user ID from auth context, fallback to 1
        details: details.map(detail => {
          // Validate detail data
          if (!detail.poDetailId) {
            throw new Error(`PO Detail ID is missing for ingredient: ${detail.ingredient.name}`);
          }
          if (!detail.ingredient.ingredientId) {
            throw new Error(`Ingredient ID is missing for ingredient: ${detail.ingredient.name}`);
          }
          if (!detail.unitCode) {
            throw new Error(`Unit code is missing for ingredient: ${detail.ingredient.name}`);
          }
          
          return {
            poDetailId: detail.poDetailId,
            ingredientId: detail.ingredient.ingredientId,
            unitCodeInput: detail.unitCode,
            qtyInput: detail.receivedQty,
            unitPrice: detail.unitPrice,
            lotNumber: detail.notes || '', // Use notes as lotNumber
            mfgDate: detail.mfgDate || null,
            expDate: detail.expDate || null,
            status: 'OK', // Default status
            note: detail.notes || ''
          };
        })
      };

      await catalogService.createGoodsReceipt(requestData);

      toast.success('Goods receipt created successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
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
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Create Goods Receipt
            </h2>
          </div>
          <button
            onClick={onClose}
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
                  {details.map((detail, index) => {
                    const hasError = detail.quantityValidation && 
                      (detail.quantityValidation.status === 'SHORT' || detail.quantityValidation.status === 'OVER');
                    
                    return (
                    <React.Fragment key={index}>
                      {/* Main data row */}
                      <tr className={`hover:bg-gray-50 ${hasError ? 'bg-red-50' : ''}`}>
                        {/* Ingredient Column - spans 2 rows */}
                        <td rowSpan={2} className="border border-gray-300 px-4 py-2">
                          <div className="font-medium">{detail.ingredient.name}</div>
                        </td>
                      
                        {/* Ordered Column */}
                        <td className="border border-gray-300 px-4 py-2 bg-blue-50">
                          <div className="space-y-1">
                            <div className="text-sm text-gray-600">Qty: {detail.orderedQty}</div>
                            <div className="text-sm text-gray-600">Unit: {detail.unitCode}</div>
                          </div>
                        </td>
                      
                        {/* Received Column */}
                        <td className="border border-gray-300 px-4 py-2">
                          <div className="space-y-2">
                            <div className="flex gap-2">
                               <input
                                 type="number"
                                 value={detail.receivedQty}
                                 onChange={(e) => handleDetailChange(index, 'receivedQty', parseFloat(e.target.value) || 0)}
                                 className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                 min="0"
                                 step="0.01"
                               />
                               <select
                                 value={detail.receivedUnitCode}
                                 onChange={(e) => handleDetailChange(index, 'receivedUnitCode', e.target.value)}
                                 className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                          
                          {/* Quantity Validation */}
                          {detail.quantityValidation && (
                            <div className="text-xs mt-1">
                              <div className={`font-medium ${
                                detail.quantityValidation.status === 'OK' ? 'text-green-600' :
                                detail.quantityValidation.status === 'SHORT' ? 'text-orange-600' :
                                detail.quantityValidation.status === 'OVER' ? 'text-blue-600' :
                                'text-gray-600'
                              }`}>
                                {detail.quantityValidation.status === 'OK' && '✓ '}
                                {detail.quantityValidation.status === 'SHORT' && '⚠ '}
                                {detail.quantityValidation.status === 'OVER' && '📦 '}
                                {detail.quantityValidation.message}
                              </div>
                            </div>
                          )}
                          </div>
                        </td>
                      
                        {/* Unit Price Column */}
                        <td className="border border-gray-300 px-4 py-2">
                          <div className="text-sm font-medium text-gray-700">
                            {detail.unitPrice.toLocaleString()} VND / {units.find(unit => unit.code === detail.unitCode)?.name || detail.unitCode}
                          </div>
                        </td>
                        {/* Line Total Column */}
                        <td className="border border-gray-300 px-4 py-2">
                          <div className="font-medium">
                            {detail.lineTotal.toLocaleString()} VND
                          </div>
                        </td>
                      
                        {/* MFG Date Column */}
                        <td className="border border-gray-300 px-4 py-2">
                          <input
                            type="date"
                            value={detail.mfgDate}
                            onChange={(e) => handleDetailChange(index, 'mfgDate', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        
                        {/* EXP Date Column */}
                        <td className="border border-gray-300 px-4 py-2">
                          <input
                            type="date"
                            value={detail.expDate}
                            onChange={(e) => handleDetailChange(index, 'expDate', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                      </tr>
                      
                      {/* Notes row - spans 6 columns (no ingredient column) */}
                      <tr className={`${hasError ? 'bg-red-50' : 'bg-gray-50'}`}>
                        <td colSpan={6} className="border border-gray-300 px-4 py-2">
                          <input
                            type="text"
                            value={detail.notes}
                            onChange={(e) => handleDetailChange(index, 'notes', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Enter notes for this item..."
                          />
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
                {details.reduce((sum, detail) => sum + detail.lineTotal, 0).toLocaleString()} VND
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
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
    </div>
  );
};

export default GoodsReceiptModal;
