import React from 'react';

export default function IncomingRequestsSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto animate-pulse">
      {/* Header Skeleton */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="h-8 bg-slate-200 rounded w-48 mb-2"></div>
          <div className="h-4 bg-slate-200 rounded w-96"></div>
        </div>
        <div className="h-10 bg-slate-200 rounded-lg w-24"></div>
      </div>

      {/* Tabs Skeleton */}
      <div className="bg-white rounded-lg border border-slate-200 p-1 mb-6 inline-flex">
        <div className="h-10 bg-slate-200 rounded-md w-32 mr-2"></div>
        <div className="h-10 bg-slate-200 rounded-md w-40"></div>
      </div>

      {/* Statistics Skeleton */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, idx) => (
          <div key={idx} className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="h-3 bg-slate-200 rounded w-24 mb-2"></div>
            <div className="h-8 bg-slate-300 rounded w-16"></div>
          </div>
        ))}
      </div>

      {/* Filter Skeleton */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-4 bg-slate-200 rounded w-12"></div>
            {[...Array(4)].map((_, idx) => (
              <div key={idx} className="h-8 bg-slate-200 rounded-lg w-20"></div>
            ))}
          </div>
          <div className="h-4 bg-slate-200 rounded w-48"></div>
        </div>
      </div>

      {/* Requests Grid Skeleton */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {[...Array(6)].map((_, idx) => (
            <div
              key={idx}
              className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col"
            >
              {/* Header with icon and status */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-8 h-8 bg-slate-200 rounded-lg"></div>
                  <div className="flex-1 min-w-0">
                    <div className="h-4 bg-slate-200 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-slate-200 rounded w-24"></div>
                  </div>
                </div>
                <div className="h-6 bg-slate-200 rounded-full w-28"></div>
              </div>

              {/* Content */}
              <div className="space-y-1.5 mb-3 flex-1">
                <div className="h-3 bg-slate-200 rounded w-full"></div>
                <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              </div>

              {/* Response Notes Input Skeleton (for pending requests) */}
              {idx % 2 === 0 && (
                <div className="mb-3">
                  <div className="h-16 bg-slate-200 rounded border border-slate-200"></div>
                </div>
              )}

              {/* Action Buttons Skeleton (for pending requests) */}
              {idx % 2 === 0 && (
                <div className="flex gap-2 mt-auto">
                  <div className="flex-1 h-8 bg-green-200 rounded"></div>
                  <div className="flex-1 h-8 bg-red-200 rounded"></div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pagination Skeleton */}
        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center justify-center gap-2">
            <div className="h-8 bg-slate-200 rounded w-8"></div>
            <div className="h-8 bg-slate-200 rounded w-8"></div>
            <div className="h-8 bg-slate-200 rounded w-8"></div>
            <div className="h-8 bg-slate-200 rounded w-8"></div>
            <div className="h-8 bg-slate-200 rounded w-8"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

