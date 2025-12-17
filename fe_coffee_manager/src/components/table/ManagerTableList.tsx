import { useEffect, useState, useMemo } from 'react';
import { Edit, Trash2, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { tableService } from '../../services';
import { Table } from '../../types';
import { TABLE_STATUS } from '../../config/constants';

interface ManagerTableListProps {
    onEditTable?: (table: Table) => void;
    onDeleteTable?: (table: Table) => void;
    refreshTrigger?: number;
}

export default function ManagerTableList({ onEditTable, onDeleteTable, refreshTrigger }: ManagerTableListProps) {
    const { user } = useAuth();
    const [tables, setTables] = useState<Table[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [capacityFilter, setCapacityFilter] = useState<string>('');
    const [capacityFilterInput, setCapacityFilterInput] = useState<string>('');
    const [currentPage, setCurrentPage] = useState<number>(0);
    const [itemsPerPage] = useState<number>(20);

    const branchId = useMemo(() => {
        if (user?.branch?.branchId) return user.branch.branchId;
        if (user?.branchId) return user.branchId;
        return null;
    }, [user]);

    useEffect(() => {
        const loadTables = async () => {
            if (!branchId) {
                setLoading(false);
                setError('Could not determine manager branch.');
                return;
            }
            try {
                setLoading(true);
                setError(null);
                const data = await tableService.getTablesByBranch(branchId);
                
                setTables(Array.isArray(data) ? data : []);
            } catch (e: any) {
                console.error('Failed to load tables', e);
                setError(`Failed to load tables: ${e.message || 'Unknown error'}`);
            } finally {
                setLoading(false);
            }
        };
        loadTables();
    }, [branchId, refreshTrigger]);

    // Debounce capacity filter so we only apply after user stops typing
    useEffect(() => {
        const handle = setTimeout(() => {
            setCapacityFilter(capacityFilterInput);
        }, 300);
        return () => clearTimeout(handle);
    }, [capacityFilterInput]);

    // Filter tables based on search term, status and capacity
    const filteredTables = useMemo(() => {
        return tables.filter(table => {
            const matchesSearch = table.label.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'ALL' || table.status === statusFilter;
            const matchesCapacity =
                !capacityFilter || table.capacity <= Number(capacityFilter);
            return matchesSearch && matchesStatus && matchesCapacity;
        });
    }, [tables, searchTerm, statusFilter, capacityFilter]);

    // Pagination logic
    const totalPages = Math.ceil(filteredTables.length / itemsPerPage);
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedTables = filteredTables.slice(startIndex, endIndex);

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(0);
    }, [searchTerm, statusFilter, capacityFilter]);


    const statusClass = (status: string) => {
        switch (status) {
            case TABLE_STATUS.AVAILABLE:
                return 'bg-green-100 text-green-800 border-green-200';
            case TABLE_STATUS.OCCUPIED:
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case TABLE_STATUS.RESERVED:
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case TABLE_STATUS.MAINTENANCE:
                return 'bg-red-100 text-red-800 border-red-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="bg-white rounded-2xl shadow border border-slate-100 p-6 animate-pulse">
                    <div className="h-6 bg-slate-200 rounded w-40 mb-4" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, idx) => (
                            <div key={idx} className="h-24 bg-slate-100 rounded-2xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white shadow rounded-2xl border border-slate-100">
            <div className="px-5 py-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Floor plan & table control</h2>
                        <p className="text-xs text-slate-500">
                            Visual view of all tables in your branch, like a real restaurant floor.
                        </p>
                    </div>

                    {/* Search and Filter Controls */}
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        {/* Search Bar */}
                        <div className="flex-1 min-w-[180px]">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search table name..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-4 py-2 pl-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400"
                                />
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Status Filter */}
                        <div className="sm:w-40">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400"
                            >
                                <option value="ALL">All status</option>
                                {Object.values(TABLE_STATUS).map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                        </div>

                        {/* Capacity Filter (<= value, input) */}
                        <div className="sm:w-40">
                            <div className="relative">
                                <input
                                    type="number"
                                    min={1}
                                    value={capacityFilterInput}
                                    onChange={(e) => setCapacityFilterInput(e.target.value)}
                                    className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400"
                                    placeholder="Max capacity"
                                />
                                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-[11px] text-slate-400">
                                    ≤
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 mb-4 text-sm">
                        {error}
                    </div>
                )}

                {/* Floor-style grid of tables */}
                {filteredTables.length > 0 ? (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {paginatedTables.map((table) => (
                            <div
                                key={table.tableId}
                                className="relative group rounded-2xl border border-slate-200 bg-slate-50/80 shadow-sm hover:shadow-md hover:border-amber-400 transition-all duration-150 p-4 flex flex-col gap-3"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wide text-slate-400">Table</p>
                                        <p className="text-sm font-semibold text-slate-900 truncate">{table.label}</p>
                                    </div>
                                    <span
                                        className={`px-2 py-1 rounded-full text-[10px] font-semibold border ${statusClass(
                                            table.status
                                        )}`}
                                    >
                                        {table.status}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-slate-500">
                                    <div className="flex items-center gap-1">
                                        <Users className="w-3.5 h-3.5 text-slate-400" />
                                        <span>
                                            Capacity{' '}
                                            <span className="font-semibold text-slate-800">
                                                {table.capacity}
                                            </span>
                                        </span>
                                    </div>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/70 border border-slate-200">
                                        ID #{table.tableId}
                                    </span>
                                </div>

                                <div className="mt-1 flex items-center justify-between gap-2">
                                    <select
                                        value={table.status}
                                        onChange={(e) => handleUpdateStatus(table.tableId, e.target.value)}
                                        className="flex-1 px-2.5 py-1.5 text-[11px] rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-amber-500/60 focus:border-amber-400"
                                    >
                                        {Object.values(TABLE_STATUS).map(status => (
                                            <option key={status} value={status}>{status}</option>
                                        ))}
                                    </select>

                                    {(onEditTable || onDeleteTable) && (
                                        <div className="flex items-center gap-1.5">
                                            {onEditTable && (
                                                <button
                                                    onClick={() => onEditTable(table)}
                                                    className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                                                    title="Edit table"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                            )}
                                            {onDeleteTable && (
                                                <button
                                                    onClick={() => onDeleteTable(table)}
                                                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                                                    title="Delete table"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="mt-6 text-center py-12">
                        <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 7h14M5 11h14M5 15h7m-7 4h4" />
                        </svg>
                        <h3 className="mt-3 text-sm font-medium text-gray-900">No tables to display</h3>
                        <p className="mt-1 text-xs text-gray-500">
                            {tables.length === 0
                                ? 'There are no tables configured for this branch yet.'
                                : 'No tables match your current filters.'}
                        </p>
                    </div>
                )}

                {/* Pagination Controls */}
                {filteredTables.length > 0 && (
                    <div className="mt-6 flex items-center justify-between text-xs text-gray-600">
                        <div>
                            Showing {startIndex + 1} to {Math.min(endIndex, filteredTables.length)} of {filteredTables.length} tables
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                disabled={currentPage <= 0}
                                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                                className={`px-3 py-1 rounded border ${
                                    currentPage <= 0
                                        ? 'text-gray-400 border-gray-200 cursor-not-allowed'
                                        : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                Previous
                            </button>
                            <span>
                                Page {currentPage + 1} of {Math.max(totalPages, 1)}
                            </span>
                            <button
                                disabled={currentPage + 1 >= totalPages}
                                onClick={() => setCurrentPage(prev => prev + 1)}
                                className={`px-3 py-1 rounded border ${
                                    currentPage + 1 >= totalPages
                                        ? 'text-gray-400 border-gray-200 cursor-not-allowed'
                                        : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
