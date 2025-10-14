import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { tableService } from '../../services';
import { CreateTableRequest, UpdateTableRequest, Table } from '../../types';
import { ManagerTableList, TableStatusSummary } from '../../components/table';
import { TABLE_STATUS } from '../../config/constants';

export function TableManagement() {
    const { user } = useAuth();
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [newTable, setNewTable] = useState<CreateTableRequest>({
        branchId: Number(user?.branchId) || 1,
        label: '',
        capacity: 2
    });
    const [editTable, setEditTable] = useState<UpdateTableRequest>({
        tableId: 0,
        label: '',
        capacity: 2,
        status: TABLE_STATUS.AVAILABLE
    });
    const [refreshTrigger, setRefreshTrigger] = useState(0);

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
                // Tables will be loaded by the TableManagementComponent
            } catch (e: any) {
                console.error('Failed to load tables', e);
                setError(`Failed to load tables: ${e.message || 'Unknown error'}`);
            } finally {
                setLoading(false);
            }
        };
        loadTables();
    }, [branchId]);

    const handleCreateTable = async () => {
        try {
            await tableService.createTable(newTable);
            setShowCreateModal(false);
            setNewTable({ branchId: Number(user?.branchId) || 1, label: '', capacity: 2 });
            // Trigger refresh
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error('Error creating table:', error);
            setError('Failed to create table');
        }
    };

    const handleEditTable = (table: Table) => {
        setSelectedTable(table);
        setEditTable({
            tableId: table.tableId,
            label: table.label,
            capacity: table.capacity,
            status: table.status
        });
        setShowEditModal(true);
    };

    const handleUpdateTable = async () => {
        try {
            // Update table basic info (label, capacity)
            await tableService.updateTable(editTable.tableId, {
                tableId: editTable.tableId,
                label: editTable.label,
                capacity: editTable.capacity
            });

            // Update table status if it has changed
            if (editTable.status && selectedTable && editTable.status !== selectedTable.status) {
                await tableService.updateTableStatus({
                    tableId: editTable.tableId,
                    status: editTable.status
                });
            }

            setShowEditModal(false);
            setSelectedTable(null);
            // Trigger refresh
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error('Error updating table:', error);
            setError('Failed to update table');
        }
    };

    const handleDeleteTable = (table: Table) => {
        setSelectedTable(table);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedTable) return;

        try {
            await tableService.deleteTable(selectedTable.tableId);
            setShowDeleteModal(false);
            setSelectedTable(null);
            // Trigger refresh
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error('Error deleting table:', error);
            setError('Failed to delete table');
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

    if (error) {
        return (
            <div className="p-8">
                <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-4">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
            <div className="max-w-7xl mx-auto px-2 py-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-8 py-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="bg-white p-2 rounded-lg">
                                    <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-white">Table Management</h1>
                                    <p className="text-amber-100 mt-1">Manage tables and their status in your branch</p>
                                </div>
                            </div>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setRefreshTrigger(prev => prev + 1)}
                                    className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
                                    title="Refresh data"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    <span className="font-medium">Refresh</span>
                                </button>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
                                >
                                    <Plus className="w-5 h-5" />
                                    <span className="font-medium">Add Table</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="p-8">
                        {/* Table Status Summary */}
                        {branchId && <TableStatusSummary branchId={Number(branchId)} />}

                        {/* Table Management */}
                        <div className="mt-6">
                            <ManagerTableList
                                onEditTable={handleEditTable}
                                onDeleteTable={handleDeleteTable}
                                refreshTrigger={refreshTrigger}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Table Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Table</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Table Name</label>
                                <input
                                    type="text"
                                    value={newTable.label}
                                    onChange={(e) => setNewTable({ ...newTable, label: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="e.g. Table 1, VIP Table 1"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Capacity</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={newTable.capacity}
                                    onChange={(e) => setNewTable({ ...newTable, capacity: parseInt(e.target.value) || 2 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateTable}
                                disabled={!newTable.label.trim()}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
                            >
                                Create Table
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Table Modal */}
            {showEditModal && selectedTable && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Table</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Table Name</label>
                                <input
                                    type="text"
                                    value={editTable.label}
                                    onChange={(e) => setEditTable({ ...editTable, label: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="e.g. Table 1, VIP Table 1"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Capacity</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={editTable.capacity}
                                    onChange={(e) => setEditTable({ ...editTable, capacity: parseInt(e.target.value) || 2 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                <select
                                    value={editTable.status || TABLE_STATUS.AVAILABLE}
                                    onChange={(e) => setEditTable({ ...editTable, status: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    {Object.values(TABLE_STATUS).map(status => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateTable}
                                disabled={!editTable.label.trim()}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
                            >
                                Update Table
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Table Modal */}
            {showDeleteModal && selectedTable && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Table</h3>

                        <div className="mb-6">
                            <p className="text-gray-600 mb-2">
                                Are you sure you want to delete table <strong>"{selectedTable.label}"</strong>?
                            </p>
                            <p className="text-sm text-red-600">
                                This action cannot be undone. The table will be permanently removed.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                            >
                                Delete Table
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}