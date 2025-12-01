import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import reservationService, { Reservation } from '../../services/reservationService';
import { tableService } from '../../services';
import { Table } from '../../types';
import { UpdateTableStatusRequest } from '../../types/table';
import { TableAssignmentModal } from '../../components/table';

export default function StaffReservations() {
    const { user } = useAuth();
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [search, setSearch] = useState<string>('');
    const [debouncedSearch, setDebouncedSearch] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'CONFIRMED' | 'SEATED' | 'COMPLETED' | 'CANCELLED'>('all');
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [detailOpen, setDetailOpen] = useState<boolean>(false);
    const [detail, setDetail] = useState<Reservation | null>(null);
    const [detailLoading, setDetailLoading] = useState<boolean>(false);
    const [showTableAssignment, setShowTableAssignment] = useState<boolean>(false);
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
    const [assignedTables, setAssignedTables] = useState<Record<number, Table[]>>({});
    const [toast, setToast] = useState<{ message: string; type?: 'error' | 'success' } | null>(null);

    const showToast = (message: string, type: 'error' | 'success' = 'error') => {
        setToast({ message, type });
        window.setTimeout(() => setToast(null), 2500);
    };

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
            } catch (e: any) {
                console.error('Failed to load reservations by branch', e);
                setError(`Failed to load reservations: ${e.message || 'Unknown error'}`);
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
        // Lọc theo ngày tạo đơn (createAt) thay vì reservedAt
        const byDate = (r: Reservation) => {
            if (!selectedDate || !r.createAt) return true;
            try {
                const d = new Date(r.createAt);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;
                return dateStr === selectedDate;
            } catch {
                return true;
            }
        };
        return reservations.filter(r => byStatus(r) && bySearch(r) && byDate(r));
    }, [reservations, statusFilter, debouncedSearch, selectedDate]);

    // Auto-load assigned tables for visible reservations so the column shows after reload
    useEffect(() => {
        const missingIds = filteredReservations
            .map(r => r.reservationId)
            .filter(id => !(id in assignedTables));
        if (missingIds.length === 0) return;

        let cancelled = false;
        const load = async () => {
            for (const id of missingIds) {
                try {
                    const tables = await tableService.getTableAssignments(id);
                    if (cancelled) return;
                    setAssignedTables(prev => ({ ...prev, [id]: tables }));
                } catch (e) {
                    // ignore row-level failure; keep UI responsive
                    // console.error('Failed to load tables for reservation', id, e);
                }
            }
        };
        load();
        return () => { cancelled = true; };
    }, [filteredReservations, assignedTables]);

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
            case 'COMPLETED':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'CANCELLED':
                return 'bg-gray-100 text-gray-800 border-gray-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const [editingId, setEditingId] = useState<number | string | null>(null);
    const statuses = ['PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED'];

    const updateStatus = async (id: number | string, status: string) => {
        try {
            setError(null);
            const normalizedTarget = String(status).toUpperCase();
            const currentAssigned = assignedTables[Number(id)] || [];
            // Block promoting to CONFIRMED/SEATED without any assigned tables
            if ((normalizedTarget === 'CONFIRMED' || normalizedTarget === 'SEATED') && currentAssigned.length === 0) {
                showToast('Please assign at least one table before changing to CONFIRMED/SEATED.', 'error');
                return;
            }
            const updated = await reservationService.updateStatus(id, status);
            setReservations(prev => prev.map(r => String(r.reservationId) === String(id) ? { ...r, status: updated.status } : r));

            // If status becomes PENDING, CANCELLED, or COMPLETED, release any assigned tables
            const normalized = String(updated.status || status).toUpperCase();
            if (normalized === 'PENDING' || normalized === 'CANCELLED' || normalized === 'COMPLETED') {
                try {
                    await tableService.removeTableAssignments(id);

                    // If status is COMPLETED, also update table status to available
                    if (normalized === 'COMPLETED') {
                        const currentTables = assignedTables[Number(id)] || [];
                        if (currentTables.length > 0) {
                            await Promise.all(
                                currentTables.map(table =>
                                    tableService.updateTableStatus({
                                        tableId: table.tableId,
                                        status: 'available'
                                    } as UpdateTableStatusRequest)
                                )
                            );
                            showToast(`Tables ${currentTables.map(t => t.label).join(', ')} released back to available`, 'success');
                        }
                    }
                } catch (e) {
                    // non-blocking: UI still updates; backend cleanup might fail silently
                    console.error('Failed to release tables:', e);
                }
                setAssignedTables(prev => ({ ...prev, [Number(id)]: [] }));
            }
        } catch (e) {
            setError('Failed to update status.');
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

    const openTableAssignment = (reservation: Reservation) => {
        setSelectedReservation(reservation);
        setShowTableAssignment(true);
    };

    const closeTableAssignment = () => {
        setShowTableAssignment(false);
        setSelectedReservation(null);
    };

    const handleTableAssignmentSuccess = async () => {
        if (selectedReservation) {
            try {
                const tables = await tableService.getTableAssignments(selectedReservation.reservationId);
                setAssignedTables(prev => ({
                    ...prev,
                    [selectedReservation.reservationId]: tables
                }));
                // Refresh reservations to update status
                const data = await reservationService.getByBranch(branchId!);
                setReservations(Array.isArray(data) ? data : []);
            } catch (e) {
                console.error('Failed to load assigned tables', e);
            }
        }
    };

    // Removed unused helper to avoid linter warning; row-level loads are handled in effect above

    return (
        <>
            {toast && (
                <div className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-lg shadow-lg text-sm border ${toast.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
                    }`}>
                    {toast.message}
                </div>
            )}
            <div className="p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                        <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-8 py-5">
                            <h1 className="text-2xl font-bold text-white">Branch Reservations</h1>
                            <p className="text-amber-100 text-sm mt-1">Quản lý các đơn đặt bàn trong chi nhánh</p>
                        </div>
                        <div className="p-6 lg:p-8">

                {loading && <div className="bg-white rounded-2xl shadow p-6">Loading...</div>}
                {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-4 mb-4">{error}</div>}

                {!loading && !error && (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <div className="flex flex-wrap items-center gap-3">
                                <>
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
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm text-gray-600">Date</label>
                                        <input
                                            type="date"
                                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                                            value={selectedDate}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                        />
                                    </div>
                                </>
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
                                            <th className="px-6 py-3 font-medium">Tables</th>
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
                                                <td className="px-6 py-4">
                                                    {assignedTables[r.reservationId]?.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {assignedTables[r.reservationId].map(table => (
                                                                <span key={table.tableId} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                                                    {table.label}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">No tables assigned</span>
                                                    )}
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
                                                            onClick={() => openTableAssignment(r)}
                                                            className="px-2 py-1 text-xs rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 inline-flex"
                                                            title="Assign tables"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                                                <path d="M9 9h6v6H9z" />
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
                    </div>
                </div>
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

            {/* Table Assignment Modal */}
            {showTableAssignment && selectedReservation && (
                <TableAssignmentModal
                    reservationId={selectedReservation.reservationId}
                    branchId={Number(branchId)}
                    partySize={selectedReservation.partySize || 1}
                    reservedAt={selectedReservation.reservedAt}
                    onClose={closeTableAssignment}
                    onSuccess={handleTableAssignmentSuccess}
                />
            )}
        </>
    );
}


