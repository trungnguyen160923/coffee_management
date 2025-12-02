import React from 'react';

export default function YearTabSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Key Metrics */}
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

      {/* Revenue Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="h-6 bg-gray-200 rounded w-64 mb-4"></div>
        <div className="h-[300px] bg-gray-100 rounded-lg"></div>
      </div>

      {/* Profit Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="h-6 bg-gray-200 rounded w-72 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="h-3 bg-gray-200 rounded w-28 mb-1"></div>
            <div className="h-7 bg-gray-300 rounded w-32 mb-1"></div>
            <div className="h-2 bg-gray-100 rounded w-24 mt-1"></div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="h-3 bg-gray-200 rounded w-32 mb-1"></div>
            <div className="h-6 bg-gray-300 rounded w-28"></div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="h-3 bg-gray-200 rounded w-40 mb-1"></div>
            <div className="h-6 bg-gray-300 rounded w-28"></div>
          </div>
        </div>
      </div>

      {/* Monthly Breakdown Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4">
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </th>
                <th className="text-right py-3 px-4">
                  <div className="h-4 bg-gray-200 rounded w-20 ml-auto"></div>
                </th>
                <th className="text-right py-3 px-4">
                  <div className="h-4 bg-gray-200 rounded w-24 ml-auto"></div>
                </th>
                <th className="text-right py-3 px-4">
                  <div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div>
                </th>
                <th className="text-right py-3 px-4">
                  <div className="h-4 bg-gray-200 rounded w-20 ml-auto"></div>
                </th>
                <th className="text-right py-3 px-4">
                  <div className="h-4 bg-gray-200 rounded w-20 ml-auto"></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {[...Array(12)].map((_, idx) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="py-3 px-4">
                    <div className="h-4 bg-gray-200 rounded w-8"></div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="h-4 bg-gray-200 rounded w-24 ml-auto"></div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="h-4 bg-gray-200 rounded w-20 ml-auto"></div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="h-4 bg-gray-200 rounded w-12 ml-auto"></div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="h-4 bg-gray-200 rounded w-8 ml-auto"></div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="h-4 bg-gray-200 rounded w-20 ml-auto"></div>
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

