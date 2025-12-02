import React from 'react';

export default function MonthTabSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Key Metrics Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="h-3 bg-gray-200 rounded w-28"></div>
              <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="h-8 bg-gray-300 rounded w-20 mb-2"></div>
            <div className="flex items-center justify-between">
              <div className="h-3 bg-gray-100 rounded w-24"></div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Metrics Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="h-3 bg-gray-200 rounded w-32"></div>
              <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="h-8 bg-gray-300 rounded w-20 mb-2"></div>
            <div className="flex items-center justify-between">
              <div className="h-3 bg-gray-100 rounded w-28"></div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="h-6 bg-gray-200 rounded w-64 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="h-3 bg-gray-200 rounded w-32 mb-1"></div>
            <div className="h-7 bg-gray-300 rounded w-28"></div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="h-3 bg-gray-200 rounded w-36 mb-1"></div>
            <div className="h-7 bg-gray-300 rounded w-32 mb-1"></div>
            <div className="h-2 bg-gray-100 rounded w-24 mt-1"></div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="h-3 bg-gray-200 rounded w-40 mb-1"></div>
            <div className="h-6 bg-gray-300 rounded w-28"></div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="h-3 bg-gray-200 rounded w-32 mb-1"></div>
            <div className="h-7 bg-gray-300 rounded w-20"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

