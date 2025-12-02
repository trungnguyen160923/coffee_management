import { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { TableStatusSummary, StaffTableList } from '../../components/table';

export default function StaffTables() {
    const { user } = useAuth();

    const branchId = useMemo(() => {
        if (user?.branch?.branchId) return user.branch.branchId;
        if (user?.branchId) return user.branchId;
        return null;
    }, [user]);

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-7xl mx-auto px-2 py-4 sm:px-4 lg:px-4">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="flex items-center justify-between px-8 pt-6 pb-3">
                        <div>
                            <h1 className="text-xl font-semibold text-slate-900">Table Management</h1>
                            <p className="text-sm text-slate-500">Quản lý bàn và trạng thái trong chi nhánh</p>
                        </div>
                    </div>
                    <div className="p-6 lg:p-8 pt-4">
                        {/* Table Status Summary */}
                        {branchId && <TableStatusSummary branchId={Number(branchId)} />}

                        {/* Table Management */}
                        <div className="mt-6">
                            <StaffTableList />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
