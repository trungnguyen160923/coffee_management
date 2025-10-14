import React, { useEffect, useState } from 'react';
import { catalogService } from '../../services/catalogService';

interface DetailRow {
  ingredient?: { name?: string };
  unitCode?: string;
  unitPrice?: number;
  qty?: number;
  lineTotal?: number;
  returnReason?: string;
}

interface ReturnGoodsRow {
  returnId?: number;
  returnNumber: string;
  poId: number;
  supplier?: { name?: string };
  branchId?: number;
  totalAmount?: number;
  createAt?: string;
  details?: DetailRow[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  returnId?: number | null;
}

const ReturnGoodsDetailModal: React.FC<Props> = ({ open, onClose, returnId }) => {
  const [data, setData] = useState<ReturnGoodsRow | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!open || !returnId) return;
      setLoading(true);
      try {
        const res = await catalogService.getReturnGoodsById(returnId);
        setData(res);
      } finally {
        setLoading(false);
      }
    };
    void fetchDetail();
  }, [open, returnId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] overflow-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-semibold">Return Goods • {data?.returnNumber || returnId}</div>
          <button onClick={onClose} className="px-2 py-1 text-sm border rounded-lg hover:bg-gray-50">Close</button>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-gray-700">
                <div><span className="font-medium">PO:</span> PO-{data?.poId}</div>
                <div><span className="font-medium">Supplier:</span> {data?.supplier?.name || 'N/A'}</div>
                <div><span className="font-medium">Branch:</span> {data?.branchId}</div>
                <div><span className="font-medium">Created:</span> {data?.createAt ? new Date(data.createAt).toLocaleString() : '-'}</div>
                <div><span className="font-medium">Total:</span> {(data?.totalAmount ?? 0).toLocaleString()} VND</div>
              </div>
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Ingredient</th>
                        <th className="px-3 py-2 text-left">Unit</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Unit Price</th>
                        <th className="px-3 py-2 text-right">Line Total</th>
                        <th className="px-3 py-2 text-left">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.details || []).map((d, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2">{d.ingredient?.name || 'Unknown'}</td>
                          <td className="px-3 py-2">{d.unitCode || '-'}</td>
                          <td className="px-3 py-2 text-right">{(d.qty ?? 0).toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">{(d.unitPrice ?? 0).toLocaleString()} VND</td>
                          <td className="px-3 py-2 text-right">{(d.lineTotal ?? 0).toLocaleString()} VND</td>
                          <td className="px-3 py-2">{d.returnReason || '-'}</td>
                        </tr>
                      ))}
                      {(data?.details || []).length === 0 && (
                        <tr><td colSpan={6} className="px-3 py-4 text-center text-gray-500">No details</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReturnGoodsDetailModal;


