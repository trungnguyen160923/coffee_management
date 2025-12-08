import React from 'react';

export default function OrdersSkeleton() {
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
            <div className="flex items-center gap-4">
              <div className="h-10 bg-slate-200 rounded-lg w-32"></div>
              <div className="h-10 bg-slate-200 rounded-lg w-24"></div>
            </div>
          </div>

          <div className="p-6 lg:p-8">
            {/* Filters Skeleton */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="h-10 bg-slate-200 rounded-lg w-32"></div>
                  <div className="h-10 bg-slate-200 rounded-lg w-32"></div>
                  <div className="h-10 bg-slate-200 rounded-lg flex-1 min-w-[220px]"></div>
                </div>
              </div>

              {/* Table Skeleton */}
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      {[...Array(7)].map((_, idx) => (
                        <th key={idx} className="px-6 py-3">
                          <div className="h-4 bg-slate-200 rounded w-20"></div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[...Array(5)].map((_, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-gray-50">
                        {[...Array(7)].map((_, colIdx) => (
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

