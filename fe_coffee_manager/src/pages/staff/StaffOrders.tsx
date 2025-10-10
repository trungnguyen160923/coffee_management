import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import orderService from '../../services/orderService';

interface SimpleOrderItem {
    productName?: string;
    quantity?: number;
}

interface SimpleOrder {
    orderId?: number | string;
    customerName?: string;
    phone?: string;
    deliveryAddress?: string;
    orderDate?: string;
    totalAmount?: number;
    paymentMethod?: string;
    paymentStatus?: string;
    status?: string;
    items?: SimpleOrderItem[];
}

export default function StaffOrders() {
    const { user } = useAuth();
    const [orders, setOrders] = useState<SimpleOrder[]>([]);
    const [search, setSearch] = useState<string>('');
    const [debouncedSearch, setDebouncedSearch] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'>('all');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [detailOpen, setDetailOpen] = useState<boolean>(false);
    const [detailOrder, setDetailOrder] = useState<any | null>(null);
    const [detailLoading, setDetailLoading] = useState<boolean>(false);
    const [editingOrderId, setEditingOrderId] = useState<number | string | null>(null);

    const branchId = useMemo(() => {
        // Prefer nested branch from backend, fallback to legacy branchId field
        if (user?.branch?.branchId) return user.branch.branchId;
        if (user?.branchId) return user.branchId;
        return null;
    }, [user]);

    useEffect(() => {
        const load = async () => {
            if (!branchId) {
                setLoading(false);
                setError('Could not determine staff branch.');
                return;
            }
            try {
                setLoading(true);
                setError(null);
                const data = await orderService.getOrdersByBranch(branchId);
                setOrders(Array.isArray(data) ? data : []);
            } catch (e: any) {
                console.error('Failed to load orders by branch', e);
                setError('Failed to load orders.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [branchId]);

    // debounce search
    useEffect(() => {
        const h = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 300);
        return () => clearTimeout(h);
    }, [search]);

    const filteredOrders = useMemo(() => {
        const byStatus = (o: SimpleOrder) => {
            if (statusFilter === 'all') return true;
            return (o.status || '').toLowerCase() === statusFilter;
        };
        const bySearch = (o: SimpleOrder) => {
            if (!debouncedSearch) return true;
            const text = `${o.orderId ?? ''} ${o.customerName ?? ''} ${o.phone ?? ''} ${o.deliveryAddress ?? ''}`.toLowerCase();
            return text.includes(debouncedSearch);
        };
        return orders.filter(o => byStatus(o) && bySearch(o));
    }, [orders, statusFilter, debouncedSearch]);

    const statusClass = (status?: string) => {
        switch ((status || '').toLowerCase()) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'preparing':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'ready':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'completed':
                return 'bg-gray-100 text-gray-800 border-gray-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const formatCurrency = (v?: number) => {
        if (v === undefined || v === null) return '0đ';
        return Number(v).toLocaleString('vi-VN') + 'đ';
    };

    const formatDate = (d?: string) => {
        if (!d) return '';
        try {
            return new Date(d).toLocaleString('vi-VN');
        } catch {
            return d;
        }
    };

    const handleUpdateStatus = async (orderId?: number | string, status?: string) => {
        if (!orderId || !status) return;
        try {
            setError(null);
            const updated = await orderService.updateOrderStatus(String(orderId), status as any);
            setOrders(prev => prev.map(o =>
                String(o.orderId) === String(orderId)
                    ? { ...o, status: (updated as any)?.status ?? status }
                    : o
            ));
        } catch (e) {
            console.error('Failed to update order status', e);
            setError('Failed to update order status.');
        }
    };

    const handleDelete = async (orderId?: number | string) => {
        if (!orderId) return;
        if (!confirm('Are you sure you want to delete this order?')) return;
        try {
            setError(null);
            await orderService.deleteOrder(String(orderId));
            setOrders(prev => prev.filter(o => String(o.orderId) !== String(orderId)));
        } catch (e) {
            console.error('Failed to delete order', e);
            setError('Failed to delete order.');
        }
    };

    const statuses = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];

    const openDetail = async (orderId?: number | string) => {
        if (!orderId) return;
        try {
            setError(null);
            setDetailLoading(true);
            const resp: any = await orderService.getOrder(String(orderId));
            const data = resp && typeof resp === 'object' && 'result' in resp ? resp.result : resp;
            setDetailOrder(data || null);
            setDetailOpen(true);
        } catch (e) {
            console.error('Failed to load order detail', e);
            setError('Failed to load order detail.');
        } finally {
            setDetailLoading(false);
        }
    };

    const closeDetail = () => {
        setDetailOpen(false);
        setDetailOrder(null);
    };

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Branch Orders</h1>
            </div>

            {loading && (
                <div className="bg-white rounded-2xl shadow p-6">Loading...</div>
            )}
            {error && (
                <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-4 mb-4">{error}</div>
            )}

            {!loading && !error && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-600">Status</label>
                                <select
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as any)}
                                >
                                    <option value="all">All</option>
                                    <option value="pending">Pending</option>
                                    <option value="preparing">Preparing</option>
                                    <option value="ready">Ready</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                            <div className="flex-1 min-w-[220px]">
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search orders..."
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400"
                                />
                            </div>
                        </div>
                    </div>
                    {orders.length === 0 ? (
                        <div className="p-6 text-gray-600">No orders yet.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 text-left text-gray-600">
                                        <th className="px-6 py-3 font-medium">Order ID</th>
                                        <th className="px-6 py-3 font-medium">Customer Name</th>
                                        <th className="px-6 py-3 font-medium">Phone</th>
                                        <th className="px-6 py-3 font-medium">Address</th>
                                        <th className="px-6 py-3 font-medium">Order Date</th>
                                        <th className="px-6 py-3 font-medium">Total Amount</th>
                                        <th className="px-6 py-3 font-medium">Payment</th>
                                        <th className="px-6 py-3 font-medium">Status</th>
                                        <th className="px-6 py-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredOrders.map((o, idx) => (
                                        <tr key={String(o.orderId || idx)} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-semibold text-gray-900">{o.orderId}</td>
                                            <td className="px-6 py-4 text-gray-800">{o.customerName || '-'}</td>
                                            <td className="px-6 py-4 text-gray-800">{o.phone || '-'}</td>
                                            <td className="px-6 py-4 text-gray-800 max-w-[320px] truncate" title={o.deliveryAddress || ''}>{o.deliveryAddress || '-'}</td>
                                            <td className="px-6 py-4 text-gray-800">{formatDate(o.orderDate)}</td>
                                            <td className="px-6 py-4 text-gray-900 font-semibold">{formatCurrency(o.totalAmount as unknown as number)}</td>
                                            <td className="px-6 py-4 text-gray-800">{o.paymentMethod || '-'}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusClass(o.status)}`}>{o.status || 'unknown'}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => openDetail(o.orderId)}
                                                        className="px-2 py-1 text-xs rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 inline-flex"
                                                        title="View details"
                                                    >
                                                        {/* Eye icon */}
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                                            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                                                            <circle cx="12" cy="12" r="3" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingOrderId(o.orderId!)}
                                                        className="px-2 py-1 text-xs rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 inline-flex"
                                                        title="Edit status"
                                                    >
                                                        {/* Pencil icon */}
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                                            <path d="M12 20h9" />
                                                            <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                                                        </svg>
                                                    </button>
                                                    {String(editingOrderId) === String(o.orderId) && (
                                                        <select
                                                            autoFocus
                                                            className="px-2 py-1 text-xs rounded-lg border border-gray-200 text-gray-700 bg-white inline-flex"
                                                            defaultValue={(o.status || '').toLowerCase()}
                                                            onBlur={() => setEditingOrderId(null)}
                                                            onChange={async (e) => {
                                                                await handleUpdateStatus(o.orderId, e.target.value);
                                                                setEditingOrderId(null);
                                                            }}
                                                        >
                                                            {statuses.map(s => (
                                                                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                    <button
                                                        onClick={() => handleDelete(o.orderId)}
                                                        className="px-2 py-1 text-xs rounded-lg border border-red-200 text-red-700 hover:bg-red-50 inline-flex"
                                                        title="Delete"
                                                    >
                                                        {/* X icon */}
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                                            <path d="M18 6L6 18" />
                                                            <path d="M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {detailOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-800">Order Details</h3>
                            <button onClick={closeDetail} className="text-gray-500 hover:text-gray-700">✕</button>
                        </div>
                        <div className="p-6">
                            {detailLoading ? (
                                <div className="text-gray-600">Loading...</div>
                            ) : !detailOrder ? (
                                <div className="text-gray-600">No data.</div>
                            ) : (
                                <div className="space-y-3 text-sm text-gray-800">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><span className="text-gray-500">Order ID:</span> <span className="font-semibold">{detailOrder.orderId}</span></div>
                                        <div><span className="text-gray-500">Status:</span> <span className="font-semibold capitalize">{(detailOrder.status || '').toLowerCase()}</span></div>
                                        <div><span className="text-gray-500">Customer:</span> <span className="font-semibold">{detailOrder.customerName || '-'}</span></div>
                                        <div><span className="text-gray-500">Phone:</span> <span className="font-semibold">{detailOrder.phone || '-'}</span></div>
                                        <div className="col-span-2"><span className="text-gray-500">Address:</span> <span className="font-semibold">{detailOrder.deliveryAddress || '-'}</span></div>
                                        <div><span className="text-gray-500">Order Date:</span> <span className="font-semibold">{formatDate(detailOrder.orderDate)}</span></div>
                                        <div><span className="text-gray-500">Payment:</span> <span className="font-semibold">{detailOrder.paymentMethod || '-'}</span></div>
                                        <div><span className="text-gray-500">Payment Status:</span> <span className="font-semibold">{detailOrder.paymentStatus || '-'}</span></div>
                                        <div><span className="text-gray-500">Total:</span> <span className="font-semibold">{formatCurrency(detailOrder.totalAmount as number)}</span></div>
                                    </div>

                                    <div className="mt-4">
                                        <h4 className="font-semibold mb-2">Items</h4>
                                        {Array.isArray(detailOrder.orderItems) && detailOrder.orderItems.length > 0 ? (
                                            <div className="border border-gray-100 rounded-xl overflow-hidden">
                                                <table className="min-w-full text-xs">
                                                    <thead>
                                                        <tr className="bg-gray-50 text-gray-600">
                                                            <th className="px-4 py-2 text-left font-medium">Product</th>
                                                            <th className="px-4 py-2 text-left font-medium">Qty</th>
                                                            <th className="px-4 py-2 text-left font-medium">Unit Price</th>
                                                            <th className="px-4 py-2 text-left font-medium">Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {detailOrder.orderItems.map((it: any, i: number) => (
                                                            <tr key={i}>
                                                                <td className="px-4 py-2">{it.productName || it.productId || '-'}</td>
                                                                <td className="px-4 py-2">{String(it.quantity ?? '-')}</td>
                                                                <td className="px-4 py-2">{formatCurrency(Number(it.unitPrice))}</td>
                                                                <td className="px-4 py-2">{formatCurrency(Number(it.totalPrice))}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="text-gray-600">No items.</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
                            <button onClick={closeDetail} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


