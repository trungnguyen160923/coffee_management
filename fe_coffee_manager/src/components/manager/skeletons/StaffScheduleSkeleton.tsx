import React from 'react';

export default function StaffScheduleSkeleton() {
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
              <div className="h-10 bg-slate-200 rounded-lg w-48"></div>
              <div className="h-10 bg-slate-200 rounded-lg w-24"></div>
              <div className="h-10 bg-slate-200 rounded-lg w-24"></div>
            </div>
          </div>

          <div className="p-8 pt-4">
            {/* Staff Selector Skeleton */}
            <div className="mb-6">
              <div className="h-10 bg-slate-200 rounded-lg w-64"></div>
            </div>

            {/* Calendar Grid Skeleton */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
              <div className="grid grid-cols-7 gap-2 mb-4">
                {[...Array(7)].map((_, idx) => (
                  <div key={idx} className="h-10 bg-slate-200 rounded"></div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {[...Array(35)].map((_, idx) => (
                  <div key={idx} className="h-28 bg-slate-100 rounded border border-gray-200">
                    <div className="p-2">
                      <div className="h-4 bg-slate-200 rounded w-6 mb-2"></div>
                      <div className="space-y-1">
                        <div className="h-4 bg-slate-200 rounded w-full"></div>
                        <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

