import React from 'react';

type GoodsReceiptDetailRow = {
  ingredient?: { name?: string };
  unitCodeInput?: string;
  qtyInput?: number;
  damageQty?: number;
  unitPrice?: number;
  lineTotal?: number;
  lotNumber?: string;
  mfgDate?: string;
  expDate?: string;
  status?: string;
  note?: string;
};

type GoodsReceiptRow = {
  grnNumber: string;
  poId: number;
  supplierName?: string;
  branchId?: number;
  status?: string;
  totalAmount?: number;
  createAt?: string;
  details?: GoodsReceiptDetailRow[];
};

interface Props {
  open: boolean;
  onClose: () => void;
  receipt: GoodsReceiptRow | null;
}

const GoodsReceiptDetailModal: React.FC<Props> = ({ open, onClose, receipt }) => {
  if (!open || !receipt) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] overflow-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-semibold">Goods Receipt Details • {receipt.grnNumber}</div>
          <button onClick={onClose} className="px-2 py-1 text-sm border rounded-lg hover:bg-gray-50">Close</button>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-gray-700">
            <div><span className="font-medium">PO:</span> PO-{receipt.poId}</div>
            <div><span className="font-medium">Supplier:</span> {receipt.supplierName}</div>
            <div><span className="font-medium">Branch:</span> {receipt.branchId}</div>
            <div><span className="font-medium">Status:</span> {receipt.status}</div>
            <div><span className="font-medium">Created:</span> {receipt.createAt ? new Date(receipt.createAt).toLocaleString() : '-'}</div>
            <div><span className="font-medium">Total:</span> {(receipt.totalAmount ?? 0).toLocaleString()} VND</div>
          </div>
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Ingredient</th>
                    <th className="px-3 py-2 text-left">Unit</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Damaged</th>
                    <th className="px-3 py-2 text-right">Unit Price</th>
                    <th className="px-3 py-2 text-right">Line Total</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Lot / MFG / EXP</th>
                  </tr>
                </thead>
                <tbody>
                  {(receipt.details || []).map((d, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2">{d.ingredient?.name || 'Unknown'}</td>
                      <td className="px-3 py-2">{d.unitCodeInput}</td>
                      <td className="px-3 py-2 text-right">{(d.qtyInput ?? 0).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">{(d.damageQty ?? 0).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">{(d.unitPrice ?? 0).toLocaleString()} VND</td>
                      <td className="px-3 py-2 text-right">{(d.lineTotal ?? 0).toLocaleString()} VND</td>
                      <td className="px-3 py-2">{d.status}</td>
                      <td className="px-3 py-2">
                        <div className="text-xs text-gray-600 space-y-0.5">
                          <div>Lot: {d.lotNumber || '-'}</div>
                          <div>MFG: {d.mfgDate || '-'}</div>
                          <div>EXP: {d.expDate || '-'}</div>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(receipt.details || []).length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-4 text-center text-gray-500">No details</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoodsReceiptDetailModal;


