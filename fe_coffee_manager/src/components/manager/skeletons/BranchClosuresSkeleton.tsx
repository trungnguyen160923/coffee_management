import React from 'react';

export default function BranchClosuresSkeleton() {
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
            {/* Filters Skeleton */}
            <div className="mb-6 flex flex-wrap gap-4">
              <div className="h-10 bg-slate-200 rounded-lg w-48"></div>
              <div className="h-10 bg-slate-200 rounded-lg w-48"></div>
              <div className="h-10 bg-slate-200 rounded-lg w-48"></div>
            </div>

            {/* Cards Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, idx) => (
                <div key={idx} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-5 bg-slate-200 rounded w-32"></div>
                    <div className="h-6 bg-slate-200 rounded-full w-20"></div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 bg-slate-200 rounded w-full"></div>
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <div className="h-9 bg-slate-200 rounded-md flex-1"></div>
                    <div className="h-9 bg-slate-200 rounded-md w-9"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

