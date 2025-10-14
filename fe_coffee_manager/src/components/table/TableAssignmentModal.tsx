import { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { tableService } from '../../services';
import { Table, AssignTableRequest, AvailableTableFilters } from '../../types';

interface TableAssignmentModalProps {
    reservationId: number;
    branchId: number;
    partySize: number;
    reservedAt: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function TableAssignmentModal({
    reservationId,
    branchId,
    partySize,
    reservedAt,
    onClose,
    onSuccess,
}: TableAssignmentModalProps) {
    const [availableTables, setAvailableTables] = useState<Table[]>([]);
    const [selectedTables, setSelectedTables] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadAvailableTables = async () => {
            try {
                setLoading(true);
                setError(null);
                const filters: AvailableTableFilters = {
                    branchId,
                    partySize,
                    reservedAt,
                };
                const tables = await tableService.getAvailableTables(filters);
                setAvailableTables(tables);
            } catch (e: any) {
                console.error('Failed to load available tables', e);
                setError(`Failed to load available tables: ${e.message || 'Unknown error'}`);
            } finally {
                setLoading(false);
            }
        };

        loadAvailableTables();
    }, [branchId, partySize, reservedAt]);

    const handleTableToggle = useCallback((tableId: number) => {
        setSelectedTables(prev => {
            const isSelected = prev.includes(tableId);
            if (isSelected) {
                return prev.filter(id => id !== tableId);
            } else {
                return [...prev, tableId];
            }
        });
    }, []);

    const handleAssign = async () => {
        if (selectedTables.length === 0) {
            setError('Please select at least one table');
            return;
        }

        try {
            setAssigning(true);
            setError(null);
            const request: AssignTableRequest = {
                reservationId,
                tableIds: selectedTables,
            };
            await tableService.assignTablesToReservation(request);
            onSuccess();
            onClose();
        } catch (e: any) {
            console.error('Failed to assign tables', e);
            setError(`Failed to assign tables: ${e.message || 'Unknown error'}`);
        } finally {
            setAssigning(false);
        }
    };

    // Tạo map để tìm kiếm O(1) thay vì O(n)
    const tableMap = useMemo(() => {
        const map = new Map<number, number>();
        availableTables.forEach(table => {
            map.set(table.tableId, table.capacity);
        });
        return map;
    }, [availableTables]);

    // Tạo Set để lookup O(1) thay vì includes() O(n)
    const selectedTablesSet = useMemo(() => new Set(selectedTables), [selectedTables]);

    // Tách riêng capacity calculation để tối ưu
    const { totalCapacity, isCapacitySufficient } = useMemo(() => {
        const total = selectedTables.reduce((sum, tableId) => {
            return sum + (tableMap.get(tableId) || 0);
        }, 0);

        return {
            totalCapacity: total,
            isCapacitySufficient: total >= partySize
        };
    }, [selectedTables, tableMap, partySize]);

    // Tách riêng labels calculation
    const selectedTableLabels = useMemo(() => {
        return selectedTables.map(id => {
            const table = availableTables.find(t => t.tableId === id);
            return table?.label || `Table ${id}`;
        });
    }, [selectedTables, availableTables]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800">Assign Tables</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        ✕
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                    {loading ? (
                        <div className="text-center text-gray-600 py-8">Loading available tables...</div>
                    ) : error ? (
                        <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-4 mb-4">
                            {error}
                        </div>
                    ) : (
                        <>
                            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                                <h4 className="font-medium text-blue-900 mb-2">Reservation Details</h4>
                                <div className="text-sm text-blue-800">
                                    <p><strong>Party Size:</strong> {partySize} people</p>
                                    <p><strong>Reserved At:</strong> {new Date(reservedAt).toLocaleString('vi-VN')}</p>
                                </div>
                            </div>

                            {availableTables.length === 0 ? (
                                <div className="text-center text-gray-600 py-8">
                                    No available tables for this time slot.
                                </div>
                            ) : (
                                <>
                                    <div className="mb-4">
                                        <h4 className="font-medium text-gray-800 mb-3">Available Tables</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {availableTables.map((table) => (
                                                <TableItem
                                                    key={table.tableId}
                                                    table={table}
                                                    isSelected={selectedTablesSet.has(table.tableId)}
                                                    onToggle={handleTableToggle}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {selectedTables.length > 0 && (
                                        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                                            <h4 className="font-medium text-gray-800 mb-2">Selected Tables</h4>
                                            <div className="text-sm text-gray-600">
                                                <p><strong>Tables:</strong> {selectedTableLabels.join(', ')}</p>
                                                <p><strong>Total Capacity:</strong> {totalCapacity} people</p>
                                                <p className={`font-medium ${isCapacitySufficient ? 'text-green-600' : 'text-red-600'}`}>
                                                    {isCapacitySufficient ? '✓ Sufficient capacity' : '⚠ Insufficient capacity'}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAssign}
                        disabled={assigning || selectedTables.length === 0 || !isCapacitySufficient}
                        className="px-4 py-2 text-sm rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {assigning ? 'Assigning...' : 'Assign Tables'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Memoized TableItem component để tránh re-render không cần thiết
interface TableItemProps {
    table: Table;
    isSelected: boolean;
    onToggle: (tableId: number) => void;
}

const TableItem = memo(({ table, isSelected, onToggle }: TableItemProps) => {
    const handleToggle = useCallback(() => {
        onToggle(table.tableId);
    }, [onToggle, table.tableId]);

    return (
        <div
            className={`p-3 border rounded-lg transition-colors ${isSelected
                ? 'border-amber-500 bg-amber-50'
                : 'border-gray-200 hover:border-gray-300'
                }`}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                    <div className="shrink-0 w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200">
                        {/* table icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                            <path d="M3 10h18" />
                            <path d="M6 10v8" />
                            <path d="M18 10v8" />
                            <rect x="4" y="6" width="16" height="4" rx="1" />
                        </svg>
                    </div>
                    <div>
                        <div className="font-medium text-gray-900">{table.label}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-gray-700">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                                    <path d="M3 6h18M3 12h18M3 18h18" />
                                </svg>
                                {table.capacity} people
                            </span>
                            {/* Hide AVAILABLE badge as requested */}
                            {table.status !== 'AVAILABLE' && (
                                <span className={`inline-flex px-2 py-0.5 rounded-full border text-[11px] ${table.status === 'RESERVED' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                    table.status === 'OCCUPIED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                        'bg-gray-50 text-gray-700 border-gray-200'
                                    }`}>
                                    {table.status}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                            e.stopPropagation();
                            handleToggle();
                        }}
                        className="w-5 h-5 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                    />
                </div>
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison để tránh re-render không cần thiết
    return (
        prevProps.table.tableId === nextProps.table.tableId &&
        prevProps.table.label === nextProps.table.label &&
        prevProps.table.capacity === nextProps.table.capacity &&
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.onToggle === nextProps.onToggle
    );
});

TableItem.displayName = 'TableItem';
