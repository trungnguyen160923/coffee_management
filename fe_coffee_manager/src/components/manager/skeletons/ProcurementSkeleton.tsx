import React from 'react';

export default function ProcurementSkeleton() {
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
            {/* Two Column Layout Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Ingredients List */}
              <div className="lg:col-span-2 space-y-4">
                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 h-10 bg-slate-200 rounded-lg"></div>
                  <div className="h-10 bg-slate-200 rounded-lg w-48"></div>
                </div>

                {/* Ingredients Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[...Array(6)].map((_, idx) => (
                    <div key={idx} className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="h-5 bg-slate-200 rounded w-32 mb-2"></div>
                      <div className="h-4 bg-slate-200 rounded w-24 mb-3"></div>
                      <div className="flex items-center gap-2">
                        <div className="h-9 bg-slate-200 rounded-md flex-1"></div>
                        <div className="h-9 bg-slate-200 rounded-md w-20"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column - Cart */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                  <div className="h-6 bg-slate-200 rounded w-32 mb-4"></div>
                  <div className="space-y-3">
                    {[...Array(3)].map((_, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                        <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
                        <div className="h-4 bg-slate-200 rounded w-16"></div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 h-10 bg-slate-200 rounded-lg"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

