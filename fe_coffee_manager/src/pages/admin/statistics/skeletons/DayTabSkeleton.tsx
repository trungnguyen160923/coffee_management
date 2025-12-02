import React from 'react';

export default function DayTabSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="h-3 bg-gray-200 rounded w-32"></div>
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

      {/* Top Performers & Need Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
            <div className="h-5 bg-gray-200 rounded w-32"></div>
          </div>
          <div className="space-y-3">
            {[...Array(3)].map((_, idx) => (
              <div key={idx} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                      <div className="h-3 bg-gray-100 rounded w-24"></div>
                    </div>
                  </div>
                  <div className="w-5 h-5 bg-gray-200 rounded"></div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="text-center p-2 bg-gray-50 rounded">
                      <div className="h-2 bg-gray-200 rounded w-16 mx-auto mb-1"></div>
                      <div className="h-4 bg-gray-300 rounded w-12 mx-auto"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Need Attention */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
            <div className="h-5 bg-gray-200 rounded w-32"></div>
          </div>
          <div className="space-y-3">
            {[...Array(2)].map((_, idx) => (
              <div key={idx} className="p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-gray-200 rounded"></div>
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                      <div className="flex gap-2 mt-1">
                        <div className="h-5 bg-gray-200 rounded w-24"></div>
                        <div className="h-5 bg-gray-200 rounded w-20"></div>
                      </div>
                    </div>
                  </div>
                  <div className="w-5 h-5 bg-gray-200 rounded"></div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="text-center p-2 bg-white rounded">
                      <div className="h-2 bg-gray-200 rounded w-16 mx-auto mb-1"></div>
                      <div className="h-4 bg-gray-300 rounded w-12 mx-auto"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Comparison */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="h-5 bg-gray-200 rounded w-40 mb-4"></div>
          <div className="h-[300px] bg-gray-100 rounded-lg"></div>
        </div>

        {/* Performance Radar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="h-5 bg-gray-200 rounded w-40 mb-4"></div>
          <div className="h-[300px] bg-gray-100 rounded-lg"></div>
        </div>
      </div>

      {/* AI System Insights */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl shadow-sm border border-amber-200 p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
          <div className="h-5 bg-gray-200 rounded w-64"></div>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, idx) => (
            <div key={idx} className="bg-white rounded-lg border border-amber-200 overflow-hidden">
              <div className="w-full flex items-center justify-between p-4 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-48"></div>
                </div>
                <div className="w-5 h-5 bg-gray-200 rounded"></div>
              </div>
              {idx === 0 && (
                <div className="p-4 pt-0 border-t border-amber-100">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-3"></div>
                  <div className="h-[200px] bg-gray-100 rounded-lg"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Branch Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="h-5 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                {[...Array(8)].map((_, idx) => (
                  <th key={idx} className="py-3 px-4">
                    <div className={`h-4 bg-gray-200 rounded ${
                      idx === 0 ? 'w-24' :
                      idx === 7 ? 'w-20' :
                      'w-28'
                    }`}></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, idx) => (
                <tr key={idx} className="border-b border-gray-100">
                  {[...Array(8)].map((_, i) => (
                    <td key={i} className="py-3 px-4">
                      <div className={`h-4 bg-gray-200 rounded ${
                        i === 0 ? 'w-32' :
                        i === 7 ? 'w-20' :
                        'w-16'
                      }`}></div>
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

