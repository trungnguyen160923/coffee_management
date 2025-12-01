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
        <div className="p-8">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-8 py-5">
                        <h1 className="text-2xl font-bold text-white">Table Management</h1>
                        <p className="text-amber-100 mt-1 text-sm">Quản lý bàn và trạng thái trong chi nhánh</p>
                    </div>
                    <div className="p-6 lg:p-8">
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
