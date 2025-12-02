import React from 'react';

export default function MonthTabSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Key Metrics Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, idx) => (
          <div key={idx} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="h-3 bg-gray-200 rounded w-24"></div>
              <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="h-6 bg-gray-300 rounded w-16 mb-2"></div>
            <div className="h-2 bg-gray-100 rounded w-12"></div>
          </div>
        ))}
      </div>

      {/* Additional Metrics Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, idx) => (
          <div key={idx} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="h-3 bg-gray-200 rounded w-28"></div>
              <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="h-6 bg-gray-300 rounded w-16 mb-2"></div>
            <div className="h-2 bg-gray-100 rounded w-12"></div>
          </div>
        ))}
      </div>

      {/* Additional Metrics Row 3 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, idx) => (
          <div key={idx} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="h-3 bg-gray-200 rounded w-24"></div>
              <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="h-6 bg-gray-300 rounded w-16 mb-2"></div>
            <div className="h-2 bg-gray-100 rounded w-12"></div>
          </div>
        ))}
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="h-6 bg-gray-200 rounded w-64 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, idx) => (
            <div key={idx} className={`rounded-lg p-4 ${
              idx === 4 ? 'bg-green-50 border border-green-200' :
              idx === 5 ? 'bg-red-50 border border-red-200' :
              'bg-gray-50'
            }`}>
              <div className="h-3 bg-gray-200 rounded w-32 mb-1"></div>
              <div className="h-7 bg-gray-300 rounded w-28 mb-1"></div>
              {idx === 4 && (
                <div className="h-2 bg-gray-100 rounded w-20 mt-1"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

