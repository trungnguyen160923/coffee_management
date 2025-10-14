import { useEffect, useState } from 'react';
import { CheckCircle, Users, Clock, Wrench } from 'lucide-react';
import { tableService } from '../../services';
import { Table } from '../../types';
import { TABLE_STATUS } from '../../config/constants';

interface TableStatusSummaryProps {
    branchId: number;
}

export default function TableStatusSummary({ branchId }: TableStatusSummaryProps) {
    const [tables, setTables] = useState<Table[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadTableStatus = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await tableService.getTableStatusSummary(branchId);
                setTables(Array.isArray(data) ? data : []);
            } catch (e: any) {
                console.error('Failed to load table status', e);
                setError(`Failed to load table status: ${e.message || 'Unknown error'}`);
            } finally {
                setLoading(false);
            }
        };

        loadTableStatus();
    }, [branchId]);

    const statusCounts = tables.reduce((acc, table) => {
        acc[table.status] = (acc[table.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const getStatusColor = (status: string) => {
        switch (status) {
            case TABLE_STATUS.AVAILABLE:
                return 'text-green-600 bg-green-100 border-green-200';
            case TABLE_STATUS.OCCUPIED:
                return 'text-blue-600 bg-blue-100 border-blue-200';
            case TABLE_STATUS.RESERVED:
                return 'text-yellow-600 bg-yellow-100 border-yellow-200';
            case TABLE_STATUS.MAINTENANCE:
                return 'text-red-600 bg-red-100 border-red-200';
            default:
                return 'text-gray-600 bg-gray-100 border-gray-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case TABLE_STATUS.AVAILABLE:
                return <CheckCircle className="h-4 w-4" />;
            case TABLE_STATUS.OCCUPIED:
                return <Users className="h-4 w-4" />;
            case TABLE_STATUS.RESERVED:
                return <Clock className="h-4 w-4" />;
            case TABLE_STATUS.MAINTENANCE:
                return <Wrench className="h-4 w-4" />;
            default:
                return <CheckCircle className="h-4 w-4" />;
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow p-6">
                <div className="text-center text-gray-600">Loading table status...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-4">
                {error}
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Table Status Summary</h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.values(TABLE_STATUS).map((status) => {
                    const count = statusCounts[status] || 0;
                    return (
                        <div key={status} className="text-center">
                            <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border ${getStatusColor(status)}`}>
                                {getStatusIcon(status)}
                                {status}
                            </div>
                            <div className="mt-2 text-xl font-bold text-gray-900">{count}</div>
                            <div className="text-xs text-gray-500">tables</div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-6">
                <div className="flex items-center justify-between">
                    <span className="text-lg font-medium text-gray-700">Total Tables</span>
                    <span className="text-2xl font-bold text-gray-900">{tables.length}</span>
                </div>
            </div>
        </div>
    );
}
