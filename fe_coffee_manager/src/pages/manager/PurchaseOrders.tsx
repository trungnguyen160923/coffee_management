import { useEffect, useState } from 'react';
import { Search, RefreshCw, Eye, Trash2, FileText, Send, Package } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import catalogService from '../../services/catalogService';
import toast from 'react-hot-toast';
import PurchaseOrderDetailModal from '../../components/purchase_order/PurchaseOrderDetailModal';
import SendToSupplierModal from '../../components/purchase_order/SendToSupplierModal';
import GoodsReceiptModal from '../../components/purchase_order/GoodsReceiptModal';
import { formatCurrency } from '../../utils/helpers';

export default function PurchaseOrders() {
  const { managerBranch } = useAuth();
  const [data, setData] = useState<{ content: any[]; totalPages: number; totalElements: number; page: number; size: number; } | null>(null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('');
  const [supplierId] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [viewing, setViewing] = useState<any | null>(null);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendingPo, setSendingPo] = useState<any | null>(null);
  const [goodsReceiptModalOpen, setGoodsReceiptModalOpen] = useState(false);
  const [goodsReceiptPo, setGoodsReceiptPo] = useState<any | null>(null);

  useEffect(() => { const t = setTimeout(() => setDebounced(search), 500); return () => clearTimeout(t); }, [search]);

  const load = async () => {
    setLoading(true);
    try {
      // Prefer fast branch fetch if no filters, else fallback to search
      if (!debounced && !status && !supplierId && managerBranch?.branchId) {
        const list = await catalogService.getPurchaseOrdersByBranch(managerBranch.branchId);
        // Sort by createAt DESC to show newest first
        const sortedList = list.sort((a, b) => new Date(b.createAt).getTime() - new Date(a.createAt).getTime());
        setData({ content: sortedList, totalPages: 1, totalElements: sortedList.length, page: 0, size });
      } else {
        const res = await catalogService.searchPurchaseOrders({ page, size, search: debounced || undefined, status: status || undefined, supplierId, branchId: managerBranch?.branchId, sortBy: 'createAt', sortDir: 'DESC' });
        // Ensure the search results are also sorted by newest first
        if (res.content) {
          res.content.sort((a, b) => new Date(b.createAt).getTime() - new Date(a.createAt).getTime());
        }
        setData(res);
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, size, debounced, status, supplierId, managerBranch?.branchId]);

  const onDelete = async (poId: number) => {
    try {
      await catalogService.deletePurchaseOrder(poId);
      toast.success('Deleted purchase order');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Delete failed');
    }
  };

  const handleSendToSupplier = (po: any) => {
    setSendingPo(po);
    setSendModalOpen(true);
  };

  const onCreateGoodsReceipt = (po: any) => {
    setGoodsReceiptPo(po);
    setGoodsReceiptModalOpen(true);
  };

  const onUpdateStatus = async (poId: number, newStatus: string) => {
    try {
      // If changing to SENT_TO_SUPPLIER, open send modal instead of direct update
      if (newStatus === 'SENT_TO_SUPPLIER') {
        const po = data?.content.find(p => p.poId === poId);
        if (po) {
          setSendingPo(po);
          setSendModalOpen(true);
        }
        return;
      }
      
      // If changing to PARTIALLY_RECEIVED, open goods receipt modal
      if (newStatus === 'PARTIALLY_RECEIVED') {
        const po = data?.content.find(p => p.poId === poId);
        if (po) {
          setGoodsReceiptPo(po);
          setGoodsReceiptModalOpen(true);
        }
        return;
      }
      
      await catalogService.updatePurchaseOrderStatus(poId, newStatus);
      toast.success('Updated status');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Update failed');
    }
  };

  const totalPages = data?.totalPages || 0;
  const totalElements = data?.totalElements || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <div className="max-w-7xl mx-auto px-2 py-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white p-2 rounded-lg">
                  <FileText className="w-8 h-8 text-amber-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Purchase Orders</h1>
                  <p className="text-amber-100 mt-1">Manage procurement documents</p>
                </div>
              </div>
              <button onClick={load} disabled={loading} className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Refresh data">
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                <span className="font-medium">Refresh</span>
              </button>
            </div>
          </div>

          <div className="p-8">
            {/* Filters */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <input type="text" placeholder="Search PO number or supplier..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="w-full px-4 py-3 pl-10 pr-4 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent" />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3"><Search className="w-5 h-5 text-gray-400" /></div>
              </div>
              <div>
                <select value={status} onChange={e => { setStatus(e.target.value); setPage(0); }} className="w-full px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent">
                  <option value="">All status</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="SENT_TO_SUPPLIER">SENT_TO_SUPPLIER</option>
                  <option value="SUPPLIER_CONFIRMED">SUPPLIER_CONFIRMED</option>
                  <option value="SUPPLIER_CANCELLED">SUPPLIER_CANCELLED</option>
                  <option value="PARTIALLY_RECEIVED">PARTIALLY_RECEIVED</option>
                  <option value="RECEIVED">RECEIVED</option>
                  <option value="CLOSED">CLOSED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
              <div></div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-left">
                      <th className="px-4 py-3 font-medium text-gray-700">PO</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Supplier</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Status</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Total</th>
                      <th className="px-4 py-3 font-medium text-gray-700 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.content.map(po => (
                      <tr key={po.poId} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span>{po.poNumber}</span>
                              {/* Show "NEW" indicator for recent POs (within last 24 hours) */}
                              {new Date().getTime() - new Date(po.createAt).getTime() < 24 * 60 * 60 * 1000 && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full font-medium">NEW</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 space-y-0.5">
                              {po.sentAt && (
                                <div>Sent: {new Date(po.sentAt).toLocaleString()}</div>
                              )}
                              {po.confirmedAt && (
                                <div>Confirmed: {new Date(po.confirmedAt).toLocaleString()}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2">{po.supplier?.name}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            po.status === 'DRAFT' ? 'bg-gray-100 text-gray-700' :
                            po.status === 'APPROVED' ? 'bg-indigo-100 text-indigo-700' :
                            po.status === 'SENT_TO_SUPPLIER' ? 'bg-orange-100 text-orange-700' :
                            po.status === 'SUPPLIER_CONFIRMED' ? 'bg-cyan-100 text-cyan-700' :
                            po.status === 'SUPPLIER_CANCELLED' ? 'bg-red-100 text-red-700' :
                            po.status === 'PARTIALLY_RECEIVED' ? 'bg-yellow-100 text-yellow-700' :
                            po.status === 'RECEIVED' ? 'bg-green-100 text-green-700' :
                            po.status === 'CLOSED' ? 'bg-gray-100 text-gray-700' :
                            po.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>{po.status}</span>
                        </td>
                        <td className="px-4 py-2">{formatCurrency(Number(po.totalAmount))}</td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2 justify-end">
                            <button className="p-2 rounded hover:bg-gray-100" title="View" onClick={() => { setViewing(po); setDetailOpen(true); }}><Eye className="w-4 h-4" /></button>
                            {po.status === 'APPROVED' && (
                              <button 
                                className="p-2 rounded hover:bg-blue-50 text-blue-600" 
                                title="Send to Supplier"
                                onClick={() => handleSendToSupplier(po)}
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            )}
                            <div className="relative">
                              <select 
                                className="text-sm border rounded px-2 py-1" 
                                value={po.status} 
                                onChange={e => onUpdateStatus(po.poId, e.target.value)}
                                disabled={po.status === 'RECEIVED' || po.status === 'CANCELLED' || po.status === 'SUPPLIER_CANCELLED' || po.status === 'CLOSED'}
                              >
                                {po.status === 'DRAFT' && (
                                  <>
                                    <option value="DRAFT">DRAFT</option>
                                    <option value="APPROVED">APPROVED</option>
                                    <option value="CANCELLED">CANCELLED</option>
                                  </>
                                )}
                                {po.status === 'APPROVED' && (
                                  <>
                                    <option value="APPROVED">APPROVED</option>
                                    <option value="SENT_TO_SUPPLIER">SENT_TO_SUPPLIER</option>
                                    <option value="CANCELLED">CANCELLED</option>
                                  </>
                                )}
                                {po.status === 'SENT_TO_SUPPLIER' && (
                                  <>
                                    <option value="SENT_TO_SUPPLIER">SENT_TO_SUPPLIER</option>
                                    <option value="CANCELLED">CANCELLED</option>
                                  </>
                                )}
                                {po.status === 'SUPPLIER_CONFIRMED' && (
                                  <>
                                    <option value="SUPPLIER_CONFIRMED">SUPPLIER_CONFIRMED</option>
                                    <option value="PARTIALLY_RECEIVED">PARTIALLY_RECEIVED</option>
                                    <option value="RECEIVED">RECEIVED</option>
                                  </>
                                )}
                                {po.status === 'PARTIALLY_RECEIVED' && (
                                  <>
                                    <option value="PARTIALLY_RECEIVED">PARTIALLY_RECEIVED</option>
                                  </>
                                )}
                                {po.status === 'RECEIVED' && (
                                  <>
                                    <option value="RECEIVED">RECEIVED</option>
                                    <option value="CLOSED">CLOSED</option>
                                  </>
                                )}
                                {po.status === 'SUPPLIER_CANCELLED' && (
                                  <option value="SUPPLIER_CANCELLED">SUPPLIER_CANCELLED</option>
                                )}
                                {po.status === 'CLOSED' && (
                                  <option value="CLOSED">CLOSED</option>
                                )}
                                {po.status === 'CANCELLED' && (
                                  <option value="CANCELLED">CANCELLED</option>
                                )}
                              </select>
                            </div>
                            {(po.status === 'DRAFT' || po.status === 'CANCELLED') && (
                              <button className="p-2 rounded hover:bg-red-50 text-red-600" title="Delete" onClick={() => onDelete(po.poId)}><Trash2 className="w-4 h-4" /></button>
                            )}
                            {po.status === 'PARTIALLY_RECEIVED' && (
                              <button className="p-2 rounded hover:bg-blue-50 text-blue-600" title="Create Additional Goods Receipt" onClick={() => onCreateGoodsReceipt(po)}><Package className="w-4 h-4" /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(!data || data.content.length === 0) && (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-gray-500">No data available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">Trang {page + 1}/{totalPages || 1} • Tổng {totalElements} purchase orders</div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50" disabled={page === 0} onClick={() => setPage(0)}>First</button>
                <button className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Prev</button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, Math.max(1, totalPages)) }).map((_, idx) => {
                    const half = 2;
                    let start = Math.max(0, Math.min(page - half, (totalPages - 1) - (5 - 1)));
                    if (totalPages <= 5) start = 0;
                    const pageNum = start + idx;
                    if (pageNum >= totalPages) return null;
                    const active = pageNum === page;
                    return (
                      <button key={pageNum} className={`px-3 py-1 text-sm border rounded-lg ${active ? 'bg-amber-600 text-white border-amber-600' : 'border-gray-300 hover:bg-gray-50'}`} onClick={() => setPage(pageNum)}>
                        {pageNum + 1}
                      </button>
                    );
                  })}
                </div>
                <button className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50" disabled={totalPages === 0 || page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</button>
                <button className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50" disabled={totalPages === 0 || page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>Last</button>
                <select className="select select-bordered select-sm" value={size} onChange={e => { setSize(Number(e.target.value)); setPage(0); }}>
                  {[5,10,20,50].map(s => <option key={s} value={s}>{s}/page</option>)}
                </select>
              </div>
            </div>
          </div>
          <PurchaseOrderDetailModal 
            open={detailOpen} 
            onClose={() => { setDetailOpen(false); setViewing(null); }} 
            po={viewing} 
            onRefresh={load}
          />
          
          <SendToSupplierModal
            open={sendModalOpen}
            onClose={() => setSendModalOpen(false)}
            po={sendingPo}
            onSuccess={load}
          />
          
          <GoodsReceiptModal
            key={goodsReceiptPo?.poId || 'new'}
            isOpen={goodsReceiptModalOpen}
            onClose={() => setGoodsReceiptModalOpen(false)}
            purchaseOrder={goodsReceiptPo}
            onSuccess={load}
          />
        </div>
      </div>
    </div>
  );
}


