import React from 'react';

export default function ShiftTemplatesSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 animate-pulse">
      <div className="max-w-7xl mx-auto px-2 py-4 sm:px-4 lg:px-4">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between px-8 pt-6 pb-3">
            <div>
              <div className="h-7 bg-slate-200 rounded w-48 mb-2"></div>
              <div className="h-4 bg-slate-200 rounded w-64"></div>
            </div>
            <div className="flex gap-3">
              <div className="h-10 bg-slate-200 rounded-lg w-24"></div>
              <div className="h-10 bg-slate-200 rounded-lg w-32"></div>
            </div>
          </div>

          <div className="p-8 pt-4">
            {/* Tabs Skeleton */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
              <div className="h-10 bg-slate-200 rounded-md w-32"></div>
              <div className="h-10 bg-slate-200 rounded-md w-32"></div>
            </div>

            {/* Table Skeleton */}
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {[...Array(6)].map((_, idx) => (
                        <th key={idx} className="px-6 py-3">
                          <div className="h-4 bg-slate-200 rounded w-20"></div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {[...Array(5)].map((_, rowIdx) => (
                      <tr key={rowIdx}>
                        {[...Array(6)].map((_, colIdx) => (
                          <td key={colIdx} className="px-6 py-4">
                            <div className="h-4 bg-slate-200 rounded w-full"></div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

