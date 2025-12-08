import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Eye, Tag, RefreshCw } from 'lucide-react';
import { discountService } from '../../services/discountService';
import { Discount, CreateDiscountRequest, UpdateDiscountRequest } from '../../types/discount';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import DiscountForm from './DiscountForm';
import DiscountDetailModal from './DiscountDetailModal';
import ConfirmModal from '../common/ConfirmModal';
import { DiscountsSkeleton } from '../manager/skeletons';

const DiscountManagement: React.FC = () => {
    const { managerBranch } = useAuth();
    const [discounts, setDiscounts] = useState<Discount[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);
    const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [discountToDelete, setDiscountToDelete] = useState<Discount | null>(null);

    const loadDiscounts = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            const response = await discountService.getAllDiscounts({
                branchId: managerBranch?.branchId,
                keyword: searchKeyword || undefined,
                page: currentPage,
                size: 10,
                sortBy: 'createAt',
                sortDir: 'desc'
            });

            // If viewing as manager (managerBranch present), ensure we exclude system-wide discounts (branchId == null)
            const filtered = managerBranch?.branchId
                ? response.content.filter(d => d.branchId === managerBranch.branchId)
                : response.content;

            setDiscounts(filtered);
            // Recalculate totals based on filtered results when client-side filtering applies
            if (managerBranch?.branchId) {
                const elements = filtered.length;
                setTotalElements(elements);
                setTotalPages(Math.max(1, Math.ceil(elements / 10)));
            } else {
                setTotalPages(response.totalPages);
                setTotalElements(response.totalElements);
            }
        } catch (error) {
            console.error('Error loading discounts:', error);
            toast.error('Unable to load discount list');
        } finally {
            if (isRefresh) {
                setRefreshing(false);
            } else {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        loadDiscounts();
    }, [currentPage, searchKeyword, managerBranch?.branchId]);

    const handleCreateDiscount = async (data: CreateDiscountRequest) => {
        try {
            await discountService.createDiscount(data);
            toast.success('Discount created successfully');
            setShowForm(false);
            loadDiscounts();
        } catch (error: any) {
            console.error('Error creating discount:', error);
            toast.error(error.response?.data?.message || 'Unable to create discount');
        }
    };

    const handleUpdateDiscount = async (data: UpdateDiscountRequest) => {
        if (!editingDiscount) return;

        try {
            await discountService.updateDiscount(editingDiscount.discountId, data);
            toast.success('Discount updated successfully');
            setShowForm(false);
            setEditingDiscount(null);
            loadDiscounts();
        } catch (error: any) {
            console.error('Error updating discount:', error);
            toast.error(error.response?.data?.message || 'Unable to update discount');
        }
    };

    const handleDeleteClick = (discount: Discount) => {
        setDiscountToDelete(discount);
        setShowDeleteModal(true);
    };

    const handleDeleteDiscount = async () => {
        if (!discountToDelete) return;

        try {
            await discountService.deleteDiscount(discountToDelete.discountId);
            toast.success('Discount deleted successfully');
            setShowDeleteModal(false);
            setDiscountToDelete(null);
            loadDiscounts();
        } catch (error: any) {
            console.error('Error deleting discount:', error);
            toast.error(error.response?.data?.message || 'Unable to delete discount');
        }
    };

    const handleEdit = (discount: Discount) => {
        setEditingDiscount(discount);
        setShowForm(true);
    };

    const handleView = (discount: Discount) => {
        setSelectedDiscount(discount);
        setShowDetail(true);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(0);
        loadDiscounts();
    };

    const formatDate = (dateString: string) => {
        const d = new Date(dateString);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    };

    const getStatusBadge = (discount: Discount) => {
        const now = new Date();
        const startDate = new Date(discount.startDate);
        const endDate = new Date(discount.endDate);

        if (!discount.active) {
            return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">Inactive</span>;
        }

        if (now < startDate) {
            return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Not Started</span>;
        }

        if (now > endDate) {
            return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Expired</span>;
        }

        if (discount.usageLimit > 0 && discount.usedCount >= discount.usageLimit) {
            return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Usage Limit Reached</span>;
        }

        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Active</span>;
    };

    if (loading && discounts.length === 0) {
        return <DiscountsSkeleton />;
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-7xl mx-auto px-2 py-4 sm:px-4 lg:px-4">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    {/* Header actions */}
                    <div className="flex items-center justify-between px-8 pt-6 pb-2">
                        <div>
                            <h1 className="text-xl font-semibold text-slate-800">Discount Management</h1>
                            <p className="text-sm text-slate-500">
                                Quản lý ưu đãi & mã giảm giá cho chi nhánh
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => loadDiscounts(true)}
                                disabled={refreshing || loading}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                            <button
                                onClick={() => {
                                    setEditingDiscount(null);
                                    setShowForm(true);
                                }}
                                className="flex items-center px-4 py-2 rounded-lg bg-sky-500 text-white text-sm font-medium shadow-sm hover:bg-sky-600"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Create Discount
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-8 pt-4">
                        <div className="mb-6">
                            {/* Search */}
                            <div className="flex gap-4 mb-4">
                                <form onSubmit={handleSearch} className="flex-1">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="text"
                                            placeholder="Search by name, code or description..."
                                            value={searchKeyword}
                                            onChange={(e) => setSearchKeyword(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                        />
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* Discounts Table */}
                        <div className="bg-white rounded-xl shadow border border-gray-200">
                            <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Code
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Type
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Value
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Period
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Usage
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-4 text-center">
                                        <div className="flex justify-center">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : discounts.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                                        No discounts found
                                    </td>
                                </tr>
                            ) : (
                                discounts.map((discount) => (
                                    <tr key={discount.discountId} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{discount.code}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{discount.name}</div>
                                            {discount.description && (
                                                <div className="text-sm text-gray-500">{discount.description}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${discount.discountType === 'PERCENT'
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-green-100 text-green-800'
                                                }`}>
                                                {discount.discountType === 'PERCENT' ? 'Percentage' : 'Fixed Amount'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {discount.discountType === 'PERCENT'
                                                    ? `${discount.discountValue}%`
                                                    : `${discount.discountValue.toLocaleString('vi-VN')} VNĐ`
                                                }
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                <div>From: {formatDate(discount.startDate)}</div>
                                                <div>To: {formatDate(discount.endDate)}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {discount.usedCount}/{discount.usageLimit === 0 ? '∞' : discount.usageLimit}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(discount)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => handleView(discount)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(discount)}
                                                    className="text-indigo-600 hover:text-indigo-900"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(discount)}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="px-6 py-3 border-t border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-gray-700">
                                            Showing {currentPage * 10 + 1} to{' '}
                                            {Math.min((currentPage + 1) * 10, totalElements)} of {totalElements}{' '}
                                            results
                                        </div>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => setCurrentPage(0)}
                                                disabled={currentPage === 0}
                                                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                First
                                            </button>
                                            <button
                                                onClick={() => setCurrentPage(currentPage - 1)}
                                                disabled={currentPage === 0}
                                                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Previous
                                            </button>
                                            <span className="px-3 py-1 text-sm">
                                                {currentPage + 1} / {totalPages}
                                            </span>
                                            <button
                                                onClick={() => setCurrentPage(currentPage + 1)}
                                                disabled={currentPage >= totalPages - 1}
                                                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Next
                                            </button>
                                            <button
                                                onClick={() => setCurrentPage(totalPages - 1)}
                                                disabled={currentPage >= totalPages - 1}
                                                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Last
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Discount Form Modal */}
            {showForm && (
                <DiscountForm
                    discount={editingDiscount}
                    managerBranch={managerBranch}
                    onSubmit={async (data: CreateDiscountRequest | UpdateDiscountRequest) => {
                        if (editingDiscount) {
                            await handleUpdateDiscount(data as UpdateDiscountRequest);
                        } else {
                            await handleCreateDiscount(data as CreateDiscountRequest);
                        }
                    }}
                    onClose={() => {
                        setShowForm(false);
                        setEditingDiscount(null);
                    }}
                />
            )}

                        {/* Discount Detail Modal */}
            {showDetail && selectedDiscount && (
                <DiscountDetailModal
                    discount={selectedDiscount}
                    onClose={() => {
                        setShowDetail(false);
                        setSelectedDiscount(null);
                    }}
                />
            )}

                        {/* Delete Confirmation Modal */}
                        <ConfirmModal
                            open={showDeleteModal}
                            title="Delete Discount"
                            description={`Are you sure you want to delete the discount "${discountToDelete?.name}" (${discountToDelete?.code})? This action cannot be undone.`}
                            confirmText="Delete"
                            cancelText="Cancel"
                            onConfirm={handleDeleteDiscount}
                            onCancel={() => {
                                setShowDeleteModal(false);
                                setDiscountToDelete(null);
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DiscountManagement;
