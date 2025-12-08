import React from 'react';

export default function AdminDashboardSkeleton() {
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
            <div className="h-10 bg-slate-200 rounded-lg w-24"></div>
          </div>

          <div className="p-8 pt-4">
            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, idx) => (
                <div key={idx} className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-5 bg-slate-200 rounded w-24"></div>
                    <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
                  </div>
                  <div className="h-8 bg-slate-300 rounded w-32 mb-2"></div>
                  <div className="h-4 bg-slate-200 rounded w-20"></div>
                </div>
              ))}
            </div>

            {/* Charts Grid Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {[...Array(2)].map((_, idx) => (
                <div key={idx} className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                  <div className="h-6 bg-slate-200 rounded w-40 mb-4"></div>
                  <div className="h-64 bg-slate-100 rounded"></div>
                </div>
              ))}
            </div>

            {/* Top Products Skeleton */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <div className="h-6 bg-slate-200 rounded w-40 mb-4"></div>
              <div className="space-y-3">
                {[...Array(5)].map((_, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-200 rounded"></div>
                      <div className="h-4 bg-slate-200 rounded w-32"></div>
                    </div>
                    <div className="h-4 bg-slate-200 rounded w-20"></div>
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

