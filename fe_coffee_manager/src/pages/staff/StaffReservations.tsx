import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import reservationService, { Reservation } from '../../services/reservationService';

export default function StaffReservations() {
    const { user } = useAuth();
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [search, setSearch] = useState<string>('');
    const [debouncedSearch, setDebouncedSearch] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'CONFIRMED' | 'SEATED' | 'CANCELLED'>('all');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [detailOpen, setDetailOpen] = useState<boolean>(false);
    const [detail, setDetail] = useState<Reservation | null>(null);
    const [detailLoading, setDetailLoading] = useState<boolean>(false);

    const branchId = useMemo(() => {
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
                const data = await reservationService.getByBranch(branchId);
                setReservations(Array.isArray(data) ? data : []);
            } catch (e) {
                setError('Failed to load reservations.');
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

    const filteredReservations = useMemo(() => {
        const byStatus = (r: Reservation) => statusFilter === 'all' ? true : String(r.status).toUpperCase() === statusFilter;
        const bySearch = (r: Reservation) => {
            if (!debouncedSearch) return true;
            const text = `${r.reservationId ?? ''} ${r.customerName ?? ''} ${r.phone ?? ''}`.toLowerCase();
            return text.includes(debouncedSearch);
        };
        return reservations.filter(r => byStatus(r) && bySearch(r));
    }, [reservations, statusFilter, debouncedSearch]);

    const formatDate = (d?: string) => {
        if (!d) return '';
        try {
            return new Date(d).toLocaleString('vi-VN');
        } catch {
            return d;
        }
    };

    const statusClass = (status?: string) => {
        switch ((status || '').toUpperCase()) {
            case 'PENDING':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'CONFIRMED':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'SEATED':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'CANCELLED':
                return 'bg-gray-100 text-gray-800 border-gray-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const [editingId, setEditingId] = useState<number | string | null>(null);
    const statuses = ['PENDING', 'CONFIRMED', 'SEATED', 'CANCELLED'];

    const updateStatus = async (id: number | string, status: string) => {
        try {
            setError(null);
            const updated = await reservationService.updateStatus(id, status);
            setReservations(prev => prev.map(r => String(r.reservationId) === String(id) ? { ...r, status: updated.status } : r));
        } catch (e) {
            setError('Failed to update status.');
        }
    };

    const remove = async (id: number | string) => {
        if (!confirm('Delete this reservation?')) return;
        try {
            setError(null);
            await reservationService.delete(id);
            setReservations(prev => prev.filter(r => String(r.reservationId) !== String(id)));
        } catch (e) {
            setError('Failed to delete reservation.');
        }
    };

    const openDetail = async (id: number | string) => {
        try {
            setError(null);
            setDetailLoading(true);
            const data = await reservationService.getById(id);
            setDetail(data);
            setDetailOpen(true);
        } catch (e) {
            setError('Failed to load reservation.');
        } finally {
            setDetailLoading(false);
        }
    };
    const closeDetail = () => { setDetailOpen(false); setDetail(null); };

    return (
        <>
            <div className="p-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Branch Reservations</h1>
                </div>

                {loading && <div className="bg-white rounded-2xl shadow p-6">Loading...</div>}
                {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-4 mb-4">{error}</div>}

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
                                        <option value="PENDING">PENDING</option>
                                        <option value="CONFIRMED">CONFIRMED</option>
                                        <option value="SEATED">SEATED</option>
                                        <option value="CANCELLED">CANCELLED</option>
                                    </select>
                                </div>
                                <div className="flex-1 min-w-[220px]">
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search reservations..."
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400"
                                    />
                                </div>
                            </div>
                        </div>
                        {reservations.length === 0 ? (
                            <div className="p-6 text-gray-600">No reservations.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 text-left text-gray-600">
                                            <th className="px-6 py-3 font-medium">ID</th>
                                            <th className="px-6 py-3 font-medium">Customer</th>
                                            <th className="px-6 py-3 font-medium">Phone</th>
                                            <th className="px-6 py-3 font-medium">Party Size</th>
                                            <th className="px-6 py-3 font-medium">Reserved At</th>
                                            <th className="px-6 py-3 font-medium">Status</th>
                                            <th className="px-6 py-3 font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredReservations.map((r) => (
                                            <tr key={r.reservationId} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 font-semibold text-gray-900">{r.reservationId}</td>
                                                <td className="px-6 py-4 text-gray-800">{r.customerName || '-'}</td>
                                                <td className="px-6 py-4 text-gray-800">{r.phone || '-'}</td>
                                                <td className="px-6 py-4 text-gray-800">{r.partySize ?? '-'}</td>
                                                <td className="px-6 py-4 text-gray-800">{formatDate(r.reservedAt)}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusClass(r.status)}`}>{r.status}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => openDetail(r.reservationId)}
                                                            className="px-2 py-1 text-xs rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 inline-flex"
                                                            title="View details"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                                                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                                                                <circle cx="12" cy="12" r="3" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingId(prev => String(prev) === String(r.reservationId) ? null : r.reservationId)}
                                                            className="px-2 py-1 text-xs rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 inline-flex"
                                                            title="Edit status"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                                                <path d="M12 20h9" />
                                                                <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                                                            </svg>
                                                        </button>
                                                        {String(editingId) === String(r.reservationId) && (
                                                            <select
                                                                autoFocus
                                                                className="px-2 py-1 text-xs rounded-lg border border-gray-200 text-gray-700 bg-white"
                                                                defaultValue={(r.status || '').toUpperCase()}
                                                                onBlur={() => setEditingId(null)}
                                                                onChange={async (e) => {
                                                                    await updateStatus(r.reservationId, e.target.value);
                                                                    setEditingId(null);
                                                                }}
                                                            >
                                                                {statuses.map(s => (
                                                                    <option key={s} value={s}>{s}</option>
                                                                ))}
                                                            </select>
                                                        )}
                                                        <button
                                                            onClick={() => remove(r.reservationId)}
                                                            className="px-2 py-1 text-xs rounded-lg border border-red-200 text-red-700 hover:bg-red-50 inline-flex"
                                                            title="Delete"
                                                        >
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
            </div>
            {detailOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-800">Reservation Details</h3>
                            <button onClick={closeDetail} className="text-gray-500 hover:text-gray-700">✕</button>
                        </div>
                        <div className="p-6">
                            {detailLoading ? (
                                <div className="text-gray-600">Loading...</div>
                            ) : !detail ? (
                                <div className="text-gray-600">No data.</div>
                            ) : (
                                <div className="space-y-3 text-sm text-gray-800">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><span className="text-gray-500">ID:</span> <span className="font-semibold">{detail!.reservationId}</span></div>
                                        <div><span className="text-gray-500">Status:</span> <span className="font-semibold capitalize">{(detail!.status || '').toUpperCase()}</span></div>
                                        <div><span className="text-gray-500">Customer:</span> <span className="font-semibold">{detail!.customerName || '-'}</span></div>
                                        <div><span className="text-gray-500">Phone:</span> <span className="font-semibold">{detail!.phone || '-'}</span></div>
                                        <div><span className="text-gray-500">Party Size:</span> <span className="font-semibold">{detail!.partySize ?? '-'}</span></div>
                                        <div className="col-span-2"><span className="text-gray-500">Reserved At:</span> <span className="font-semibold">{formatDate(detail!.reservedAt)}</span></div>
                                        <div className="col-span-2"><span className="text-gray-500">Notes:</span> <span className="font-semibold">{detail!.notes || '-'}</span></div>
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
        </>
    );
}


