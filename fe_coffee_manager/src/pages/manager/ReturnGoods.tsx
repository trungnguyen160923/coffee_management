import { useEffect, useState } from 'react';
import { catalogService } from '../../services/catalogService';
import { useAuth } from '../../context/AuthContext';
import { Package, RefreshCw, Search, Loader } from 'lucide-react';
import ReturnGoodsDetailModal from '../../components/manager/ReturnGoodsDetailModal';

interface Page<T> { content: T[]; totalPages: number; totalElements: number; }
interface ReturnRow {
  returnNumber: string;
  poId: number;
  supplier?: { name?: string };
  branchId: number;
  status?: string;
  totalAmount?: number;
  createAt: string;
}

export default function ReturnGoods() {
  const { managerBranch } = useAuth();
  const [data, setData] = useState<Page<ReturnRow> | null>(null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [viewingId, setViewingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const numericPo = query && /^\d+$/.test(query.trim()) ? Number(query.trim()) : undefined;
      const res = await catalogService.searchReturnGoods({
        poId: numericPo,
        returnNumber: query || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        branchId: managerBranch?.branchId, // Lọc theo chi nhánh của manager
        page,
        size,
        sortBy: 'createAt',
        sortDirection: 'DESC'
      });
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, size, managerBranch?.branchId]);
  useEffect(() => {
    const t = setTimeout(() => { setPage(0); void load(); }, 400);
    return () => clearTimeout(t);
  }, [query, fromDate, toDate]);

  return (
    <>
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-2 py-4 sm:px-4 lg:px-4">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header actions */}
          <div className="flex items-center justify-between px-8 pt-6 pb-3">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Return Goods</h1>
              <p className="text-sm text-slate-500">Coffee Shop Management System</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={load}
                disabled={loading}
                className="flex items-center space-x-2 rounded-lg bg-slate-100 text-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <div className="p-8 pt-4">
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="w-full bg-white border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-sky-500 focus-within:border-transparent h-12">
                <div className="flex items-center gap-2 px-3 py-0 h-12">
                  {loading ? (<Loader className="w-4 h-4 text-gray-400 animate-spin" />) : (<Search className="w-4 h-4 text-gray-400" />)}
                  <input type="text" placeholder="Search Return Number or PO ID..." value={query} onChange={(e) => setQuery(e.target.value)} className="flex-1 bg-transparent outline-none text-gray-700 placeholder-gray-400 h-9 leading-none text-sm" />
                </div>
              </div>
              <div>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
                <div className="text-xs text-gray-500 mt-1">From date (inclusive)</div>
              </div>
              <div>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
                <div className="text-xs text-gray-500 mt-1">To date (inclusive)</div>
              </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-left">
                      <th className="px-4 py-3 font-medium text-gray-700">Return</th>
                      <th className="px-4 py-3 font-medium text-gray-700">PO</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Supplier</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Created</th>
                      <th className="px-4 py-3 font-medium text-gray-700 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.content.map((row, idx) => (
                      <tr key={idx} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-sm text-blue-700">{row.returnNumber}</td>
                        <td className="px-4 py-2">PO-{row.poId}</td>
                        <td className="px-4 py-2">{row.supplier?.name || 'N/A'}</td>
                        <td className="px-4 py-2">{new Date(row.createAt).toLocaleString()}</td>
                        <td className="px-4 py-2 text-right font-medium">{(row.totalAmount ?? 0).toLocaleString()} VND</td>
                        <td className="px-4 py-2 text-right">
                          <button onClick={() => setViewingId((row as any).returnId || (row as any).id)} className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50">View</button>
                        </td>
                      </tr>
                    ))}
                    {(!data || data.content.length === 0) && (
                      <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">No data available</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">Page {page + 1}/{data?.totalPages ?? 1} • Total {data?.totalElements ?? 0}</div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50" disabled={page === 0} onClick={() => setPage(0)}>First</button>
                <button className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Prev</button>
                <button className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50" disabled={!data || page >= (data.totalPages - 1)} onClick={() => setPage(p => p + 1)}>Next</button>
                <button className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50" disabled={!data || page >= (data.totalPages - 1)} onClick={() => setPage((data?.totalPages ?? 1) - 1)}>Last</button>
                <select className="select select-bordered select-sm" value={size} onChange={e => { setSize(Number(e.target.value)); setPage(0); }}>
                  {[5,10,20,50].map(s => <option key={s} value={s}>{s}/page</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <ReturnGoodsDetailModal open={viewingId != null} onClose={() => setViewingId(null)} returnId={viewingId ?? undefined} />
    </>
  );
}


