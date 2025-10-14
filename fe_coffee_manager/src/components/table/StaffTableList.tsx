import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { tableService } from '../../services';
import { Table, UpdateTableStatusRequest } from '../../types';
import { TABLE_STATUS } from '../../config/constants';

export default function StaffTableList() {
    const { user } = useAuth();
    const [tables, setTables] = useState<Table[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [currentPage, setCurrentPage] = useState<number>(0);
    const [itemsPerPage] = useState<number>(7);

    const branchId = useMemo(() => {
        if (user?.branch?.branchId) return user.branch.branchId;
        if (user?.branchId) return user.branchId;
        return null;
    }, [user]);

    useEffect(() => {
        const loadTables = async () => {
            if (!branchId) {
                setLoading(false);
                setError('Could not determine staff branch.');
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
    }, [branchId]);

    // Filter tables based on search term and status
    const filteredTables = useMemo(() => {
        return tables.filter(table => {
            const matchesSearch = table.label.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'ALL' || table.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [tables, searchTerm, statusFilter]);

    // Pagination logic
    const totalPages = Math.ceil(filteredTables.length / itemsPerPage);
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedTables = filteredTables.slice(startIndex, endIndex);

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(0);
    }, [searchTerm, statusFilter]);

    const handleUpdateStatus = async (tableId: number, status: string) => {
        try {
            setError(null);
            const request: UpdateTableStatusRequest = { tableId, status };
            const updatedTable = await tableService.updateTableStatus(request);
            setTables(prev => prev.map(t => t.tableId === tableId ? updatedTable : t));
        } catch (e: any) {
            setError(`Failed to update table status: ${e.message || 'Unknown error'}`);
        }
    };

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
            <div className="p-8">
                <div className="bg-white rounded-2xl shadow p-6">
                    <div className="text-center text-gray-600">Loading tables...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Staff Table Management</h2>

                {/* Search and Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    {/* Search Bar */}
                    <div className="flex-1">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search tables by label..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-2 pl-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400"
                            />
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Status Filter */}
                    <div className="sm:w-80">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400"
                        >
                            <option value="ALL">All Status</option>
                            {Object.values(TABLE_STATUS).map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-4 mb-4">
                        {error}
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="w-1/4 px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Label</th>
                                <th className="w-1/6 px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
                                <th className="w-1/6 px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="w-1/3 px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedTables.map((table) => (
                                <tr key={table.tableId} className="hover:bg-gray-50">
                                    <td className="w-1/4 px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {table.label}
                                    </td>
                                    <td className="w-1/6 px-6 py-5 whitespace-nowrap text-sm text-gray-500 text-center">
                                        {table.capacity} people
                                    </td>
                                    <td className="w-1/6 px-6 py-5 whitespace-nowrap text-sm text-gray-500 text-center">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusClass(table.status)}`}>
                                            {table.status}
                                        </span>
                                    </td>
                                    <td className="w-1/3 px-6 py-5 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex items-center justify-center">
                                            <select
                                                value={table.status}
                                                onChange={(e) => handleUpdateStatus(table.tableId, e.target.value)}
                                                className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 bg-white min-w-[120px]"
                                            >
                                                {Object.values(TABLE_STATUS).map(status => (
                                                    <option key={status} value={status}>{status}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredTables.length === 0 && (
                    <div className="text-center py-12">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No tables</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {tables.length === 0 ? 'There are no tables in the system.' : 'No tables match your search criteria.'}
                        </p>
                    </div>
                )}

                {/* Pagination Controls */}
                {filteredTables.length > 0 && (
                    <div className="mt-6 flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            Showing {startIndex + 1} to {Math.min(endIndex, filteredTables.length)} of {filteredTables.length} tables
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                disabled={currentPage <= 0}
                                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                                className={`px-3 py-1 rounded border text-sm ${currentPage <= 0
                                    ? 'text-gray-400 border-gray-200 cursor-not-allowed'
                                    : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                Previous
                            </button>
                            <span className="text-sm text-gray-600">
                                Page {currentPage + 1} of {Math.max(totalPages, 1)}
                            </span>
                            <button
                                disabled={currentPage + 1 >= totalPages}
                                onClick={() => setCurrentPage(prev => prev + 1)}
                                className={`px-3 py-1 rounded border text-sm ${currentPage + 1 >= totalPages
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
