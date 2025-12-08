import React from 'react';

export default function RecipesSkeleton() {
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
          </div>

          <div className="p-6 lg:p-8 pt-4">
            {/* Filters Skeleton */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="h-10 bg-slate-200 rounded-lg w-32"></div>
              <div className="h-10 bg-slate-200 rounded-lg flex-1 min-w-[220px]"></div>
            </div>

            {/* Categories Grid Skeleton */}
            <div className="space-y-8">
              {[...Array(2)].map((_, catIdx) => (
                <div key={catIdx} className="space-y-4">
                  {/* Category Header */}
                  <div className="flex items-center justify-between">
                    <div className="h-6 bg-slate-200 rounded w-32"></div>
                    <div className="h-4 bg-slate-200 rounded w-20"></div>
                  </div>
                  {/* Recipe Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, idx) => (
                      <div key={idx} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                        {/* Image Skeleton */}
                        <div className="w-full h-48 bg-slate-200"></div>
                        {/* Recipe Name Skeleton */}
                        <div className="p-4">
                          <div className="h-6 bg-slate-200 rounded w-full"></div>
                        </div>
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

