import React from 'react';

export default function DashboardSkeleton() {
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
            <div className="h-9 bg-slate-200 rounded-lg w-24"></div>
          </div>

          <div className="p-6 lg:p-8 pt-4">
            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, idx) => (
                <div key={idx} className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-4 bg-slate-200 rounded w-24"></div>
                    <div className="w-8 h-8 bg-slate-200 rounded"></div>
                  </div>
                  <div className="h-8 bg-slate-300 rounded w-20"></div>
                </div>
              ))}
            </div>

            {/* Quick Actions Skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, idx) => (
                <div key={idx} className="h-20 bg-slate-200 rounded-lg"></div>
              ))}
            </div>

            {/* Tabs Skeleton */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
              {[...Array(3)].map((_, idx) => (
                <div key={idx} className="h-10 bg-slate-200 rounded-md w-32"></div>
              ))}
            </div>

            {/* Tab Content Skeleton */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              {/* Filters Skeleton */}
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="h-8 bg-slate-200 rounded-lg w-32"></div>
                  <div className="h-8 bg-slate-200 rounded-lg w-32"></div>
                  <div className="h-8 bg-slate-200 rounded-lg flex-1 min-w-[220px]"></div>
                </div>
              </div>

              {/* Content Grid Skeleton */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, idx) => (
                    <div key={idx} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                      {/* Image Skeleton */}
                      <div className="w-full h-32 bg-slate-200"></div>
                      {/* Content Skeleton */}
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="h-5 bg-slate-200 rounded w-32"></div>
                          <div className="h-5 bg-slate-200 rounded w-16"></div>
                        </div>
                        <div className="mt-3">
                          <div className="h-3 bg-slate-200 rounded w-12 mb-1.5"></div>
                          <div className="flex flex-wrap gap-1.5">
                            {[...Array(3)].map((_, i) => (
                              <div key={i} className="h-6 bg-slate-200 rounded w-12"></div>
                            ))}
                          </div>
                        </div>
                        <div className="h-9 bg-slate-200 rounded-md w-full mt-3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

