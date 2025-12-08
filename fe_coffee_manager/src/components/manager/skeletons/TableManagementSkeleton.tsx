import React from 'react';

export default function TableManagementSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 animate-pulse">
      <div className="max-w-7xl mx-auto px-2 py-4 sm:px-4 lg:px-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between px-8 pt-6 pb-3">
            <div>
              <div className="h-7 bg-slate-200 rounded w-48 mb-2"></div>
              <div className="h-4 bg-slate-200 rounded w-64"></div>
            </div>
            <div className="h-10 bg-slate-200 rounded-lg w-32"></div>
          </div>

          <div className="p-6 lg:p-8 pt-4">
            {/* Table Status Summary Skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, idx) => (
                <div key={idx} className="bg-white rounded-lg shadow-md border border-gray-200 p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
                  </div>
                  <div className="h-8 bg-slate-300 rounded w-12 mx-auto mb-2"></div>
                  <div className="h-4 bg-slate-200 rounded w-20 mx-auto"></div>
                </div>
              ))}
            </div>

            {/* Table List Skeleton */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-6">
                <div className="h-6 bg-slate-200 rounded w-48 mb-4"></div>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1 h-10 bg-slate-200 rounded-lg"></div>
                  <div className="sm:w-80 h-10 bg-slate-200 rounded-lg"></div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {[...Array(4)].map((_, idx) => (
                          <th key={idx} className="px-6 py-4">
                            <div className="h-4 bg-slate-200 rounded w-20"></div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {[...Array(5)].map((_, rowIdx) => (
                        <tr key={rowIdx}>
                          {[...Array(4)].map((_, colIdx) => (
                            <td key={colIdx} className="px-6 py-5">
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
    </div>
  );
}

