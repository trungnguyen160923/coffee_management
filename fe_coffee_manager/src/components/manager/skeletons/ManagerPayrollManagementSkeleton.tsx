import React from 'react';

export default function ManagerPayrollManagementSkeleton() {
  return (
    <div className="p-6 animate-pulse">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-4">
          <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
        </div>
      </div>

      {/* Filters and Action Buttons */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="h-10 bg-gray-200 rounded-lg w-full"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-10 bg-gray-200 rounded-lg w-36"></div>
          <div className="h-10 bg-gray-200 rounded-lg w-24"></div>
          <div className="h-10 bg-gray-200 rounded-lg w-10"></div>
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <div className="h-4 bg-gray-200 rounded w-6"></div>
                </th>
                <th className="px-6 py-3 text-left">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </th>
                <th className="px-6 py-3 text-left">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </th>
                <th className="px-6 py-3 text-left">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </th>
                <th className="px-6 py-3 text-left">
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </th>
                <th className="px-6 py-3 text-left">
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[...Array(8)].map((_, rowIdx) => (
                <tr key={rowIdx}>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-4"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
