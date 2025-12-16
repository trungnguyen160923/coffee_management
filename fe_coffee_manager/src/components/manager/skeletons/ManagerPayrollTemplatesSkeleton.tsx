import React from 'react';

export default function ManagerPayrollTemplatesSkeleton() {
  return (
    <div className="p-6 animate-pulse">
      {/* Header */}
      <div className="mb-6">
        <div className="h-8 bg-gray-200 rounded w-56 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-96"></div>
      </div>

      {/* Tabs and Create Button */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex space-x-8">
            <div className="h-12 bg-gray-200 rounded w-24"></div>
            <div className="h-12 bg-gray-200 rounded w-20"></div>
            <div className="h-12 bg-gray-200 rounded w-20"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded-lg w-32"></div>
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </th>
                <th className="px-6 py-3 text-left">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </th>
                <th className="px-6 py-3 text-left">
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </th>
                <th className="px-6 py-3 text-left">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </th>
                <th className="px-6 py-3 text-left">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
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
                    <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-40"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <div className="h-4 bg-gray-200 rounded w-4"></div>
                      <div className="h-4 bg-gray-200 rounded w-4"></div>
                      <div className="h-4 bg-gray-200 rounded w-4"></div>
                    </div>
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
