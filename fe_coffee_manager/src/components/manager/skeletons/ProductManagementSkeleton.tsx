import React from 'react';

export default function ProductManagementSkeleton() {
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
            {/* Search and Filters Skeleton */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 h-10 bg-slate-200 rounded-lg"></div>
                <div className="h-10 bg-slate-200 rounded-lg w-48"></div>
                <div className="h-10 bg-slate-200 rounded-lg w-48"></div>
              </div>
            </div>

            {/* Product Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, idx) => (
                <div key={idx} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                  {/* Image Skeleton */}
                  <div className="w-full h-48 bg-slate-200"></div>
                  {/* Content Skeleton */}
                  <div className="p-4">
                    <div className="h-5 bg-slate-200 rounded w-32 mb-2"></div>
                    <div className="h-4 bg-slate-200 rounded w-24 mb-3"></div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="h-6 bg-slate-200 rounded w-20"></div>
                      <div className="h-6 bg-slate-200 rounded w-16"></div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-9 bg-slate-200 rounded-md flex-1"></div>
                      <div className="h-9 bg-slate-200 rounded-md w-9"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Skeleton */}
            <div className="mt-6 flex items-center justify-between">
              <div className="h-4 bg-slate-200 rounded w-32"></div>
              <div className="flex gap-2">
                {[...Array(5)].map((_, idx) => (
                  <div key={idx} className="h-9 bg-slate-200 rounded w-9"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

