import React from 'react';

export default function RewardsPenaltiesManagementSkeleton() {
  return (
    <div className="p-6 bg-gray-50 min-h-screen animate-pulse">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="h-8 bg-gray-200 rounded w-80 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-10 bg-gray-200 rounded-lg w-32"></div>
          <div className="h-10 bg-gray-200 rounded-lg w-48"></div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[...Array(6)].map((_, idx) => (
          <div key={idx} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-28"></div>
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="h-10 bg-gray-200 rounded-lg w-32"></div>
          <div className="h-10 bg-gray-200 rounded-lg w-32"></div>
          <div className="h-10 bg-gray-200 rounded-lg w-40"></div>
          <div className="h-10 bg-gray-200 rounded-lg w-40"></div>
          <div className="h-10 bg-gray-200 rounded-lg w-64"></div>
          <div className="h-10 bg-gray-200 rounded-lg w-24"></div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {[...Array(8)].map((_, idx) => (
                  <th key={idx} className="px-6 py-3 text-left">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[...Array(8)].map((_, rowIdx) => (
                <tr key={rowIdx}>
                  {[...Array(8)].map((_, colIdx) => (
                    <td key={colIdx} className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded w-full"></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
