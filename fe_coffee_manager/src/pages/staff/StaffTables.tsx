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
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Table Management</h1>
                <p className="text-gray-600 mt-2">Manage tables and their status in your branch</p>
            </div>

            {/* Table Status Summary */}
            {branchId && <TableStatusSummary branchId={Number(branchId)} />}

            {/* Table Management */}
            <div className="mt-6">
                <StaffTableList />
            </div>
        </div>
    );
}
