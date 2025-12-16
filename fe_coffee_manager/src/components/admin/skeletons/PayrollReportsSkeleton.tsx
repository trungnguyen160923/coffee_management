import React from 'react';

export default function PayrollReportsSkeleton() {
  return (
    <div className="p-6 animate-pulse">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-64"></div>
        </div>
        <div className="h-10 bg-gray-200 rounded-lg w-32"></div>
      </div>

      {/* Filters Skeleton */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
            <div className="h-10 bg-gray-200 rounded-lg w-full"></div>
          </div>
          <div>
            <div className="h-4 bg-gray-200 rounded w-28 mb-2"></div>
            <div className="h-10 bg-gray-200 rounded-lg w-full"></div>
          </div>
        </div>
      </div>

      {/* Statistics Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, idx) => (
          <div key={idx} className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-32"></div>
              </div>
              <div className="w-8 h-8 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Status Breakdown Skeleton */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, idx) => (
            <div key={idx}>
              <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-12"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Table Skeleton */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="h-6 bg-gray-200 rounded w-24"></div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {[...Array(6)].map((_, idx) => (
                  <th key={idx} className="px-6 py-3 text-left">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[...Array(5)].map((_, rowIdx) => (
                <tr key={rowIdx}>
                  {[...Array(6)].map((_, colIdx) => (
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
