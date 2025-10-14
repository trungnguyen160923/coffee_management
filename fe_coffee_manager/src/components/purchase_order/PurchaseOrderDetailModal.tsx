import { useEffect, useState } from 'react';
import { X, FileText, Truck, Edit, Trash2 } from 'lucide-react';
import catalogService from '../../services/catalogService';
import toast from 'react-hot-toast';
import { formatCurrency, formatQuantity } from '../../utils/helpers';

interface PurchaseOrderDetailModalProps {
  open: boolean;
  onClose: () => void;
  po: any | null;
  onRefresh?: () => void;
}

export default function PurchaseOrderDetailModal({ open, onClose, po, onRefresh }: PurchaseOrderDetailModalProps) {
  const [localPo, setLocalPo] = useState<any | null>(po);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ qty: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => { setLocalPo(po); }, [po]);

  if (!open || !localPo) return null;

  const items = localPo.details || [];
  const canEdit = localPo.status === 'DRAFT';

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setEditForm({
      qty: item.qty.toString()
    });
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    
    setLoading(true);
    try {
      const updatedPo = await catalogService.updatePurchaseOrderDetail(editingItem.id, {
        qty: parseFloat(editForm.qty)
      });
      toast.success('Cập nhật thành công');
      setEditingItem(null);
      if (updatedPo) setLocalPo(updatedPo);
      onRefresh?.();
    } catch (error: any) {
      toast.error(error.message || 'Cập nhật thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: any) => {
    if (!confirm(`Bạn có chắc muốn xóa "${item.ingredient?.name}" khỏi đơn hàng?`)) return;
    
    setLoading(true);
    try {
      await catalogService.deletePurchaseOrderDetail(item.id);
      toast.success('Xóa thành công');
      // Cập nhật UI cục bộ để phản ánh thay đổi ngay lập tức
      setLocalPo((prev: any) => {
        if (!prev) return prev;
        const newDetails = (prev.details || []).filter((d: any) => d.id !== item.id);
        const newTotal = newDetails.reduce((sum: number, d: any) => sum + Number(d.lineTotal || 0), 0);
        return { ...prev, details: newDetails, totalAmount: newTotal };
      });
      onRefresh?.();
    } catch (error: any) {
      toast.error(error.message || 'Xóa thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={onClose} />
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-6 pt-6 pb-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="bg-amber-50 p-2 rounded-lg">
                  <FileText className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Purchase Order #{localPo.poNumber}</h3>
                  <div className="text-sm text-gray-500">PO ID: {localPo.poId}</div>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Close">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Header info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Supplier</div>
                <div className="mt-1 text-gray-900 font-semibold">{localPo.supplier?.name}</div>
                <div className="text-xs text-gray-500">{localPo.supplier?.phone} • {localPo.supplier?.email}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Status / Total</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${localPo.status === 'DRAFT' ? 'bg-gray-100 text-gray-700' : localPo.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' : localPo.status === 'RECEIVED' ? 'bg-green-100 text-green-700' : localPo.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{localPo.status}</span>
                  <span className="text-gray-900 font-semibold">{formatCurrency(Number(localPo.totalAmount))}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">Branch #{localPo.branchId}</div>
                <div className="text-xs text-gray-500 mt-1 space-x-2">
                  {localPo.expectedDeliveryAt && (<span>ETA: {new Date(localPo.expectedDeliveryAt).toLocaleDateString()}</span>)}
                  {localPo.shippingCost !== undefined && (<span>Ship: {formatCurrency(Number(localPo.shippingCost))}</span>)}
                </div>
                <div className="text-xs text-gray-400 mt-1 space-x-2">
                  {localPo.sentAt && (<span>Sent: {new Date(localPo.sentAt).toLocaleString()}</span>)}
                  {localPo.confirmedAt && (<span>Confirmed: {new Date(localPo.confirmedAt).toLocaleString()}</span>)}
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="bg-white rounded-lg border">
              <div className="px-4 py-3 border-b bg-gray-50 font-semibold flex items-center gap-2"><Truck className="w-4 h-4" /> Items</div>
              <div className="max-h-80 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Ingredient</th>
                      <th className="px-3 py-2 text-left">Unit</th>
                      <th className="px-3 py-2 text-left">Qty</th>
                      <th className="px-3 py-2 text-left">Unit Price</th>
                      <th className="px-3 py-2 text-left">Line Total</th>
                      {canEdit && <th className="px-3 py-2 text-left">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((d: any) => (
                      <tr key={d.id} className="border-t">
                        <td className="px-3 py-2 text-gray-900">{d.ingredient?.name}</td>
                        <td className="px-3 py-2">{d.unitCode || d.ingredient?.unit?.code}</td>
                        <td className="px-3 py-2">
                          {editingItem?.id === d.id ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.qty}
                              onChange={(e) => setEditForm({ ...editForm, qty: e.target.value })}
                              className="w-20 px-2 py-1 border rounded text-sm"
                            />
                          ) : (
                            formatQuantity(Number(d.qty))
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {formatCurrency(Number(d.unitPrice))}
                        </td>
                        <td className="px-3 py-2 font-medium">
                          {editingItem?.id === d.id ? (
                            <span className="text-blue-600">
                              {formatCurrency(parseFloat(editForm.qty || '0') * Number(editingItem?.unitPrice ?? d.unitPrice))}
                            </span>
                          ) : (
                            formatCurrency(Number(d.lineTotal))
                          )}
                        </td>
                        {canEdit && (
                          <td className="px-3 py-2">
                            {editingItem?.id === d.id ? (
                              <div className="flex gap-1">
                                <button
                                  onClick={handleSaveEdit}
                                  disabled={loading}
                                  className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:opacity-50"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingItem(null)}
                                  disabled={loading}
                                  className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleEdit(d)}
                                  disabled={loading}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(d)}
                                  disabled={loading}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={canEdit ? 6 : 5} className="px-3 py-6 text-center text-gray-500">No items</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Timestamps */}
            <div className="mt-4 grid grid-cols-2 gap-4 text-xs text-gray-500">
              <div>Created: {new Date(localPo.createAt).toLocaleString()}</div>
              <div>Updated: {new Date(localPo.updateAt).toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


