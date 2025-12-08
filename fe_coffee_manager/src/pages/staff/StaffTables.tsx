import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { TableStatusSummary, StaffTableList } from '../../components/table';
import { TablesSkeleton } from '../../components/staff/skeletons';
import { RefreshCw } from 'lucide-react';

export default function StaffTables() {
    const { user } = useAuth();
    const [initialLoading, setInitialLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const branchId = useMemo(() => {
        if (user?.branch?.branchId) return user.branch.branchId;
        if (user?.branchId) return user.branchId;
        return null;
    }, [user]);

    useEffect(() => {
        setInitialLoading(false);
    }, []);

    const handleRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    if (initialLoading) {
        return <TablesSkeleton />;
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-7xl mx-auto px-2 py-4 sm:px-4 lg:px-4">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="flex items-center justify-between px-8 pt-6 pb-3">
                        <div>
                            <h1 className="text-xl font-semibold text-slate-900">Table Management</h1>
                            <p className="text-sm text-slate-500">Table and Status Management at the Branch Level.</p>
                        </div>
                        <button
                            onClick={handleRefresh}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </button>
                    </div>
                    <div className="p-6 lg:p-8 pt-4">
                        {/* Table Status Summary */}
                        {branchId && <TableStatusSummary branchId={Number(branchId)} refreshTrigger={refreshTrigger} />}

                        {/* Table Management */}
                        <div className="mt-6">
                            <StaffTableList refreshTrigger={refreshTrigger} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
