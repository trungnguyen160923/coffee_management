import React from 'react';

export default function POSTableManagementSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-slate-200 rounded w-40"></div>
          <div className="h-10 bg-slate-200 rounded-lg w-32"></div>
        </div>

        {/* Table Status Summary Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="bg-slate-50 border border-gray-200 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
              </div>
              <div className="h-8 bg-slate-300 rounded w-12 mx-auto mb-2"></div>
              <div className="h-4 bg-slate-200 rounded w-20 mx-auto"></div>
            </div>
          ))}
        </div>

        {/* Tables Grid Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, idx) => (
            <div key={idx} className="p-4 rounded-xl border-2 border-gray-200 bg-white">
              <div className="text-center">
                {/* Table Icon Skeleton */}
                <div className="mb-3 flex justify-center">
                  <div className="w-12 h-12 bg-slate-200 rounded-full"></div>
                </div>
                {/* Table Number Skeleton */}
                <div className="h-7 bg-slate-200 rounded w-16 mx-auto mb-2"></div>
                {/* Status Badge Skeleton */}
                <div className="h-6 bg-slate-200 rounded-full w-24 mx-auto mb-2"></div>
                {/* Capacity Skeleton */}
                <div className="h-4 bg-slate-200 rounded w-20 mx-auto"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

