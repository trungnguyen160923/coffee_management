import React from 'react';

export default function ManagerDashboardSkeleton() {
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
            <div className="h-9 bg-slate-200 rounded-lg w-24"></div>
          </div>

          <div className="p-8 pt-4">
            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, idx) => (
                <div key={idx} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
                      <div className="h-8 bg-slate-300 rounded w-20 mb-2"></div>
                      <div className="h-3 bg-slate-200 rounded w-32"></div>
                    </div>
                    <div className="w-12 h-12 bg-slate-200 rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {[...Array(2)].map((_, idx) => (
                <div key={idx} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                  <div className="h-6 bg-slate-200 rounded w-48 mb-4"></div>
                  <div className="h-[300px] bg-slate-100 rounded"></div>
                </div>
              ))}
            </div>

            {/* Low Stock & Staff Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(2)].map((_, idx) => (
                <div key={idx} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-6 bg-slate-200 rounded w-32"></div>
                    <div className="w-5 h-5 bg-slate-200 rounded"></div>
                  </div>
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="p-4 bg-slate-50 rounded-xl">
                        <div className="h-5 bg-slate-200 rounded w-32 mb-2"></div>
                        <div className="h-4 bg-slate-200 rounded w-48"></div>
                      </div>
                    ))}
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

