import React from 'react';

export default function PayrollManagementSkeleton() {
  return (
    <div className="p-6 animate-pulse">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-4">
          <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
        </div>
        
        {/* Tabs Skeleton */}
        <div className="border-b border-gray-200">
          <div className="flex space-x-8">
            <div className="h-12 bg-gray-200 rounded w-56"></div>
            <div className="h-12 bg-gray-200 rounded w-40"></div>
          </div>
        </div>
      </div>

      {/* Manager Tab Content Skeleton */}
      <div>
        {/* Action Buttons Skeleton */}
        <div className="mb-6 flex items-center justify-end gap-2">
          <div className="h-10 bg-gray-200 rounded-lg w-20"></div>
          <div className="h-10 bg-gray-200 rounded-lg w-24"></div>
          <div className="h-10 bg-gray-200 rounded-lg w-36"></div>
          <div className="h-10 bg-gray-200 rounded-lg w-10"></div>
        </div>

        {/* Filters Skeleton */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-10 bg-gray-200 rounded-lg w-full"></div>
            </div>
            <div>
              <div className="h-4 bg-gray-200 rounded w-28 mb-2"></div>
              <div className="h-10 bg-gray-200 rounded-lg w-full"></div>
            </div>
            <div>
              <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-10 bg-gray-200 rounded-lg w-full"></div>
            </div>
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
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
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
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
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
    </div>
  );
}






